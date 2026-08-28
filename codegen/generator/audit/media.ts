import { asObject, type JsonObject, objectEntries, type OpenApiDocument } from "../openapi.ts";
import {
  type OpenApiRequestBodyFamily,
  type OpenApiResponseDecoder,
  reviewedRequestMediaPolicy,
  reviewedResponseMediaPolicy,
} from "../media_oracle.ts";
import { pointerToken, resolveLocalObject } from "./document.ts";
import {
  type AuditContext,
  diagnostic,
  type OpenApiAuditMetrics,
  type OpenApiDefaultNoContentResponseBranch,
  type OpenApiRequestMediaBranch,
  type OpenApiResponseMediaBranch,
} from "./model.ts";
import { type AuditedOperationUse, operationKey } from "./operations.ts";

export function collectRequestMedia(
  { document, provider, metrics, diagnostics }: AuditContext,
  use: AuditedOperationUse,
  branches: OpenApiRequestMediaBranch[],
): void {
  const { operationId, normalizedPath } = use;
  const requestBody = resolveLocalObject(document, use.operation.requestBody);
  if (requestBody === undefined) return;
  for (const [mediaType, mediaValue] of objectEntries(requestBody.content)) {
    metrics.requestMediaBranches++;
    const media = resolveLocalObject(document, mediaValue);
    const policy = reviewedRequestMediaPolicy(
      mediaType,
      resolvedMediaSchema(document, mediaValue),
    );
    incrementRequestMediaMetric(metrics, policy.family);
    const pointer = `${use.pointer}/requestBody/content/${pointerToken(mediaType)}`;
    if (policy.family === "json" && media !== undefined && media.schema === undefined) {
      metrics.missingMediaSchemas++;
      diagnostics.push(diagnostic(
        provider,
        `${pointer}/schema`,
        "missing-media-schema",
        "emit-strict-json-data",
      ));
    }
    const resolvedSchema = resolvedMediaSchema(document, mediaValue);
    if (policy.family === "text" && schemaIsObject(resolvedSchema)) {
      metrics.requestMediaSchemaConflicts++;
      diagnostics.push(diagnostic(
        provider,
        `${pointer}/schema`,
        "request-media-schema-conflict",
        "honor-wire-text-discard-object-schema",
      ));
    }
    branches.push({
      key: requestMediaBranchKey(
        provider,
        use.method,
        normalizedPath,
        operationId,
        mediaType,
      ),
      pointer,
      operationKey: operationKey(use),
      operationId,
      method: use.method.toUpperCase(),
      path: normalizedPath,
      mediaType,
      expectedBodyFamily: policy.family,
      policy: policy.policy,
    });
    if (media !== undefined && Object.hasOwn(media, "encoding")) {
      metrics.requestEncodingUses++;
      diagnostics.push(diagnostic(
        provider,
        `${pointer}/encoding`,
        "request-encoding",
        "reject-unsupported-request-encoding",
      ));
    }
  }
}

function incrementRequestMediaMetric(
  metrics: OpenApiAuditMetrics,
  family: OpenApiRequestBodyFamily,
): void {
  if (family === "json") metrics.requestJsonMediaBranches++;
  else if (family === "form") metrics.requestFormMediaBranches++;
  else if (family === "text") metrics.requestTextMediaBranches++;
  else metrics.requestBinaryMediaBranches++;
}

function incrementResponseDecoderMetric(
  metrics: OpenApiAuditMetrics,
  decoder: OpenApiResponseDecoder,
): void {
  if (decoder === "json") metrics.responseJsonDecoderBranches++;
  else if (decoder === "text") metrics.responseTextDecoderBranches++;
  else metrics.responseBinaryDecoderBranches++;
}

function resolvedMediaSchema(
  document: OpenApiDocument,
  mediaValue: unknown,
): JsonObject | undefined {
  const media = resolveLocalObject(document, mediaValue);
  return media === undefined ? undefined : resolveLocalObject(document, media.schema);
}

function schemaIsObject(schema: JsonObject | undefined): boolean {
  return schema !== undefined &&
    (schema.type === "object" || asObject(schema.properties) !== undefined ||
      schema.additionalProperties !== undefined);
}

export function collectResponseMedia(
  { document, provider, metrics, diagnostics }: AuditContext,
  use: AuditedOperationUse,
  responseMedia: OpenApiResponseMediaBranch[],
  defaultNoContentResponses: OpenApiDefaultNoContentResponseBranch[],
): void {
  const { operation, operationId, normalizedPath } = use;
  const responseEntries = objectEntries(operation.responses);
  const explicitResponseStatuses = new Set(
    responseEntries.flatMap(([status]) => {
      const parsed = exactNumericStatus(status);
      return parsed === undefined ? [] : [parsed];
    }),
  );
  for (const [status, responseValue] of responseEntries) {
    const responsePointer = `${use.pointer}/responses/${pointerToken(status)}`;
    if (isWildcardStatus(status)) {
      metrics.wildcardStatuses++;
      diagnostics.push(diagnostic(
        provider,
        responsePointer,
        "wildcard-response-status",
        "reject-unsupported-wildcard-status",
      ));
    }
    const response = resolveLocalObject(document, responseValue);
    if (response === undefined) continue;

    const content = objectEntries(response.content);
    if (status === "default" && use.method !== "head" && content.length > 0) {
      for (const noContentStatus of [204, 205] as const) {
        if (explicitResponseStatuses.has(noContentStatus)) continue;
        metrics.defaultNoContentResponseBranches++;
        defaultNoContentResponses.push({
          key: defaultNoContentResponseBranchKey(
            provider,
            use.method,
            normalizedPath,
            operationId,
            noContentStatus,
          ),
          pointer: `${responsePointer}/content`,
          operationKey: operationKey(use),
          operationId,
          method: use.method.toUpperCase(),
          path: normalizedPath,
          status: noContentStatus,
          expectedBodyFamily: "undefined",
          policy: "runtime-no-content-overrides-default-content",
        });
      }
    }
    metrics.responseMediaBranches += content.length;
    for (const [mediaType, mediaValue] of content) {
      const policy = reviewedResponseMediaPolicy(
        mediaType,
        resolvedMediaSchema(document, mediaValue),
      );
      const mediaPointer = `${responsePointer}/content/${pointerToken(mediaType)}`;
      const media = resolveLocalObject(document, mediaValue);
      if (policy.decoder === "json" && media !== undefined && media.schema === undefined) {
        metrics.missingMediaSchemas++;
        diagnostics.push(diagnostic(
          provider,
          `${mediaPointer}/schema`,
          "missing-media-schema",
          "emit-strict-json-data",
        ));
      }
      incrementResponseDecoderMetric(metrics, policy.decoder);
      const parsedStatus = exactNumericStatus(status) ??
        (isWildcardStatus(status) ? status.toUpperCase() : status);
      responseMedia.push({
        key: responseMediaBranchKey(
          provider,
          use.method,
          normalizedPath,
          operationId,
          parsedStatus,
          mediaType,
        ),
        pointer: mediaPointer,
        operationKey: operationKey(use),
        operationId,
        method: use.method.toUpperCase(),
        path: normalizedPath,
        status: parsedStatus,
        mediaType,
        expectedDecoder: policy.decoder,
        expectedBodyFamily: responseHasNoBody(use.method, parsedStatus)
          ? "undefined"
          : policy.bodyFamily,
        policy: policy.policy,
      });
    }

    const numericStatus = exactNumericStatus(status);
    if (numericStatus !== undefined && (numericStatus < 200 || numericStatus >= 300)) {
      metrics.non2xxResponses++;
      if (content.length === 0) {
        metrics.non2xxResponsesMissingBodies++;
        diagnostics.push(diagnostic(
          provider,
          `${responsePointer}/content`,
          "non-2xx-response-without-body",
          "preserve-undefined-body",
        ));
      }
    }

    for (const [, headerValue] of objectEntries(response.headers)) {
      if (resolveLocalObject(document, headerValue) !== undefined) metrics.responseHeaderUses++;
    }
  }
}

export function requestMediaBranchKey(
  provider: string,
  method: string,
  path: string,
  operationId: string,
  mediaType: string,
): string {
  return JSON.stringify([
    provider,
    method.toUpperCase(),
    path,
    operationId,
    "request",
    mediaType.toLowerCase(),
  ]);
}

export function responseMediaBranchKey(
  provider: string,
  method: string,
  path: string,
  operationId: string,
  status: number | string,
  mediaType: string,
): string {
  return JSON.stringify([
    provider,
    method.toUpperCase(),
    path,
    operationId,
    status,
    mediaType.toLowerCase(),
  ]);
}

function defaultNoContentResponseBranchKey(
  provider: string,
  method: string,
  path: string,
  operationId: string,
  status: 204 | 205,
): string {
  return JSON.stringify([
    provider,
    method.toUpperCase(),
    path,
    operationId,
    status,
    "default-no-content",
  ]);
}

function responseHasNoBody(method: string, status: number | string): boolean {
  return method.toUpperCase() === "HEAD" || status === 204 || status === 205;
}

export function assertUniqueMediaKeys(
  branches: readonly { key: string }[],
  direction: "request" | "response" | "default no-content response",
): void {
  const seen = new Set<string>();
  for (const branch of branches) {
    if (seen.has(branch.key)) {
      throw new Error(`Duplicate ${direction} media branch key: ${branch.key}`);
    }
    seen.add(branch.key);
  }
}

function exactNumericStatus(value: string): number | undefined {
  if (!/^\d{3}$/.test(value)) return undefined;
  const status = Number(value);
  return Number.isInteger(status) ? status : undefined;
}

function isWildcardStatus(value: string): boolean {
  return /^[1-5]XX$/i.test(value);
}
