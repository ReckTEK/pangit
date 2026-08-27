import {
  asObject,
  asString,
  httpMethods,
  type JsonObject,
  objectEntries,
  type OpenApiDocument,
  resolveLocalReference,
} from "./openapi.ts";
import {
  type OpenApiRequestBodyFamily,
  type OpenApiResponseBodyFamily,
  type OpenApiResponseDecoder,
  reviewedRequestMediaPolicy,
  reviewedResponseMediaPolicy,
} from "./media_oracle.ts";

export {
  type OpenApiRequestBodyFamily,
  type OpenApiResponseBodyFamily,
  type OpenApiResponseDecoder,
  reviewedRequestMediaPolicy,
  reviewedResponseMediaPolicy,
} from "./media_oracle.ts";

/**
 * Deterministic use-site diagnostics for one normalized OpenAPI document.
 *
 * Count semantics:
 * - `operations`: locally resolvable HTTP Operation Objects under `paths` and `x-ms-paths`.
 * - `traceOperationUses`: valid OpenAPI TRACE operations, which this Fetch client rejects.
 * - `missingOperationIds`: operations without a string `operationId` (the generator synthesizes one).
 * - `synthesizedPathParameters`: unique path captures per operation absent from its effective
 *   path-level plus operation-level parameters, matching generator synthesis behavior.
 * - `responseMediaBranches`: media-type entries across locally resolved operation responses.
 *   `responseJsonDecoderBranches`, `responseTextDecoderBranches`, and
 *   `responseBinaryDecoderBranches` independently project expected decoder from reviewed explicit
 *   media policy and locally resolved schema facts.
 * - `defaultNoContentResponseBranches`: synthetic 204/205 static response members required when a
 *   content-bearing `default` response covers either status and no explicit status overrides it.
 * - `requestMediaBranches`: media-type entries across locally resolved operation request bodies.
 *   `requestJsonMediaBranches`, `requestFormMediaBranches`, `requestTextMediaBranches`, and
 *   `requestBinaryMediaBranches` partition those entries by expected wire serializer from reviewed
 *   explicit media policy. Request and response directions have separate policy entries.
 * - `fetchForbiddenRequestBodies`: GET/HEAD operations declaring a request body. Generated clients
 *   preserve these provider contracts, but native Fetch rejects calls which actually send them.
 * - `missingMediaSchemas`: JSON request/response media entries without a schema. Generated types
 *   deliberately fall back to strict JSON data rather than unconstrained `unknown` values.
 * - `requestMediaSchemaConflicts`: text request media entries carrying an object schema. Generated
 *   clients honor the text wire contract and deliberately discard the incompatible object shape.
 * - `optionalPathGroups`: unescaped provider route groups. Parameter-bearing groups become
 *   all-or-none runtime path groups; standalone literal-only groups expose a typed include selector
 *   with a reviewed default. `literalOptionalPathGroups` is the literal-only subset.
 * - `non2xxResponses`: exact numeric response statuses outside 200-299; `default` and wildcard
 *   ranges are excluded. `non2xxResponsesMissingBodies` is the subset with no content entries.
 * - `responseHeaderUses`: named headers on operation responses after resolving local response and
 *   header references. Reuse through multiple operations is counted at each use site.
 * - `securityRequirements`: effective Security Requirement Object alternatives per operation.
 *   Operation `security` replaces root security, including an explicit empty array; otherwise the
 *   root array is inherited. Objects, rather than schemes within each object, are counted.
 * - `conditionalOuterPropertyRequiredLosses`: required names in an immediate `oneOf`/`anyOf`
 *   branch which are absent from that branch's properties and cannot be preserved because the
 *   branch renders through `$ref`, `enum`, `const`, or array precedence. Ordinary branches inherit
 *   declared outer schemas and synthesize an unconstrained schema for undeclared required names.
 * - `malformedRequiredNonObjectUses`: schema objects with a `required` array which explicitly
 *   render as a non-object. One diagnostic is emitted per malformed schema, not per required name.
 * - `int64SchemaOccurrences`: parsed objects declaring `type: integer` and `format: int64`.
 * - parameter feature metrics count effective parameter uses after operation overrides path-level
 *   declarations by `(in, name)`.
 * - `wildcardStatuses`: response keys in the `1XX` through `5XX` form.
 * - `requestEncodingUses`: request media objects declaring an `encoding` member, including `{}`.
 * - `callbackUses`: named callback entries declared by operations.
 * - `serverVariableDeclarations`: variable names in every Server Object found in a `servers` array.
 * - `externalReferenceUses`: `$ref` string occurrences which do not start with `#/`; they are
 *   counted but never fetched or resolved.
 */
export type OpenApiAuditMetrics = {
  operations: number;
  traceOperationUses: number;
  missingOperationIds: number;
  synthesizedPathParameters: number;
  requestMediaBranches: number;
  requestJsonMediaBranches: number;
  requestFormMediaBranches: number;
  requestTextMediaBranches: number;
  requestBinaryMediaBranches: number;
  fetchForbiddenRequestBodies: number;
  responseMediaBranches: number;
  responseJsonDecoderBranches: number;
  responseTextDecoderBranches: number;
  responseBinaryDecoderBranches: number;
  defaultNoContentResponseBranches: number;
  missingMediaSchemas: number;
  requestMediaSchemaConflicts: number;
  optionalPathGroups: number;
  literalOptionalPathGroups: number;
  non2xxResponses: number;
  non2xxResponsesMissingBodies: number;
  responseHeaderUses: number;
  securityRequirements: number;
  conditionalOuterPropertyRequiredLosses: number;
  malformedRequiredNonObjectUses: number;
  int64SchemaOccurrences: number;
  cookieParameterUses: number;
  deepObjectParameterUses: number;
  allowReservedParameterUses: number;
  wildcardStatuses: number;
  requestEncodingUses: number;
  callbackUses: number;
  serverVariableDeclarations: number;
  externalReferenceUses: number;
};

export type OpenApiDiagnosticKind =
  | "allow-reserved-parameter"
  | "callback"
  | "conditional-required-loss"
  | "cookie-parameter"
  | "external-reference"
  | "fetch-forbidden-request-body"
  | "malformed-required-non-object"
  | "missing-media-schema"
  | "missing-operation-id"
  | "non-2xx-response-without-body"
  | "request-encoding"
  | "request-media-schema-conflict"
  | "literal-optional-path-group"
  | "parameterized-optional-path-group"
  | "server-variable"
  | "synthesized-path-parameter"
  | "trace-operation"
  | "wildcard-response-status";

/** Provider, JSON pointer, diagnostic kind, reviewed handling policy. */
export type OpenApiDiagnosticEntry = readonly [
  provider: string,
  pointer: string,
  kind: OpenApiDiagnosticKind,
  policy: string,
];

export type OpenApiRequestMediaBranch = {
  key: string;
  pointer: string;
  operationKey: string;
  operationId: string;
  method: string;
  path: string;
  mediaType: string;
  expectedBodyFamily: OpenApiRequestBodyFamily;
  policy: string;
};

export type OpenApiResponseMediaBranch = {
  key: string;
  pointer: string;
  operationKey: string;
  operationId: string;
  method: string;
  path: string;
  status: number | string;
  mediaType: string;
  expectedDecoder: OpenApiResponseDecoder;
  expectedBodyFamily: OpenApiResponseBodyFamily;
  policy: string;
};

export type OpenApiDefaultNoContentResponseBranch = {
  key: string;
  pointer: string;
  operationKey: string;
  operationId: string;
  method: string;
  path: string;
  status: 204 | 205;
  expectedBodyFamily: "undefined";
  policy: "runtime-no-content-overrides-default-content";
};

export type OpenApiDocumentAudit = {
  summary: OpenApiAuditMetrics;
  diagnostics: OpenApiDiagnosticEntry[];
  requestMedia: OpenApiRequestMediaBranch[];
  responseMedia: OpenApiResponseMediaBranch[];
  defaultNoContentResponses: OpenApiDefaultNoContentResponseBranch[];
};

type OperationUse = {
  collectionName: string;
  method: string;
  pointer: string;
  rawPath: string;
  embeddedQuery: boolean;
  pathItem: JsonObject;
  operation: JsonObject;
};

type ParameterUse = {
  parameter: JsonObject;
  pointer: string;
};

/** Audit one parsed normalized OpenAPI document without reading generated sources. */
export function auditOpenApiDocument(
  document: OpenApiDocument,
  provider = "fixture",
): OpenApiDocumentAudit {
  const metrics = emptyMetrics();
  const diagnostics: OpenApiDiagnosticEntry[] = [];
  const requestMedia: OpenApiRequestMediaBranch[] = [];
  const responseMedia: OpenApiResponseMediaBranch[] = [];
  const defaultNoContentResponses: OpenApiDefaultNoContentResponseBranch[] = [];
  const operations = collectOperationUses(document);
  metrics.operations = operations.length;
  collectTraceDiagnostics(document, provider, metrics, diagnostics);

  for (const use of operations) {
    const { rawPath, embeddedQuery, pathItem, operation } = use;
    const normalizedPath = normalizePath(rawPath, embeddedQuery);
    for (const group of optionalPathGroupUses(rawPath, embeddedQuery)) {
      metrics.optionalPathGroups++;
      if (group.literal) metrics.literalOptionalPathGroups++;
      diagnostics.push(diagnostic(
        provider,
        `${use.pointer}/$optionalPathGroups/${group.index}`,
        group.literal ? "literal-optional-path-group" : "parameterized-optional-path-group",
        group.policy,
      ));
    }
    const operationId = asString(operation.operationId) ?? `${use.method} ${normalizedPath}`;
    if (asString(operation.operationId) === undefined) {
      metrics.missingOperationIds++;
      diagnostics.push(diagnostic(
        provider,
        `${use.pointer}/operationId`,
        "missing-operation-id",
        "synthesize-stable-operation-name",
      ));
    }

    const parameters = effectiveParameters(
      document,
      pathItem.parameters,
      operation.parameters,
      use.pointer.slice(0, use.pointer.lastIndexOf("/")),
      use.pointer,
    );
    const availablePathParameters = new Set(
      [...parameters.values()]
        .filter(({ parameter }) => parameter.in === "path")
        .map(({ parameter }) => asString(parameter.name))
        .filter((name): name is string => name !== undefined),
    );
    const synthesized = new Set<string>();
    for (const name of pathCaptureNames(normalizedPath)) {
      if (availablePathParameters.has(name)) continue;
      synthesized.add(name);
    }
    for (const name of synthesized) {
      metrics.synthesizedPathParameters++;
      diagnostics.push(diagnostic(
        provider,
        `${use.pointer}/parameters/$synthesized/${pointerToken(name)}`,
        "synthesized-path-parameter",
        "synthesize-required-string",
      ));
    }

    for (const { parameter, pointer } of parameters.values()) {
      if (parameter.in === "cookie") metrics.cookieParameterUses++;
      if (parameter.style === "deepObject") metrics.deepObjectParameterUses++;
      if (parameter.allowReserved === true) metrics.allowReservedParameterUses++;
      if (parameter.in === "cookie") {
        diagnostics.push(diagnostic(
          provider,
          pointer,
          "cookie-parameter",
          "reject-unsupported-parameter-location",
        ));
      }
      if (parameter.allowReserved === true) {
        diagnostics.push(diagnostic(
          provider,
          `${pointer}/allowReserved`,
          "allow-reserved-parameter",
          "reject-unsupported-query-serialization",
        ));
      }
    }

    metrics.securityRequirements += securityRequirementCount(
      Object.hasOwn(operation, "security") ? operation.security : document.security,
    );
    for (const [name] of objectEntries(operation.callbacks)) {
      metrics.callbackUses++;
      diagnostics.push(diagnostic(
        provider,
        `${use.pointer}/callbacks/${pointerToken(name)}`,
        "callback",
        "reject-unsupported-callback",
      ));
    }
    if (
      (use.method === "get" || use.method === "head") &&
      Object.hasOwn(operation, "requestBody")
    ) {
      metrics.fetchForbiddenRequestBodies++;
      diagnostics.push(diagnostic(
        provider,
        `${use.pointer}/requestBody`,
        "fetch-forbidden-request-body",
        "preserve-provider-contract-document-native-fetch-limitation",
      ));
    }
    collectRequestMediaMetrics(
      metrics,
      requestMedia,
      diagnostics,
      document,
      provider,
      use,
      operationId,
      normalizedPath,
    );

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

  walkObjects(document, "#", (value, pointer) => {
    if (
      value.type === "integer" && asString(value.format)?.toLowerCase() === "int64"
    ) {
      metrics.int64SchemaOccurrences++;
    }
    const reference = asString(value.$ref);
    if (reference !== undefined && !reference.startsWith("#/")) {
      metrics.externalReferenceUses++;
      diagnostics.push(diagnostic(
        provider,
        `${pointer}/$ref`,
        "external-reference",
        "reject-external-reference",
      ));
    }
    for (const lossPointer of conditionalRequiredLossPointers(value, pointer)) {
      metrics.conditionalOuterPropertyRequiredLosses++;
      diagnostics.push(diagnostic(
        provider,
        lossPointer,
        "conditional-required-loss",
        "reject-unpreserved-required-field",
      ));
    }
    for (const malformedPointer of malformedRequiredPointers(value, pointer)) {
      metrics.malformedRequiredNonObjectUses++;
      diagnostics.push(diagnostic(
        provider,
        malformedPointer,
        "malformed-required-non-object",
        "preserve-upstream-schema-diagnostic",
      ));
    }
    for (const variablePointer of serverVariablePointers(value.servers, pointer)) {
      metrics.serverVariableDeclarations++;
      diagnostics.push(diagnostic(
        provider,
        variablePointer,
        "server-variable",
        "require-explicit-server-substitution",
      ));
    }
  });

  assertUniqueMediaKeys(requestMedia, "request");
  assertUniqueMediaKeys(responseMedia, "response");
  assertUniqueMediaKeys(defaultNoContentResponses, "default no-content response");
  return {
    summary: metrics,
    diagnostics: diagnostics.toSorted(compareDiagnosticEntries),
    requestMedia: requestMedia.toSorted(compareMediaBranches),
    responseMedia: responseMedia.toSorted(compareMediaBranches),
    defaultNoContentResponses: defaultNoContentResponses.toSorted(compareMediaBranches),
  };
}

function emptyMetrics(): OpenApiAuditMetrics {
  return {
    operations: 0,
    traceOperationUses: 0,
    missingOperationIds: 0,
    synthesizedPathParameters: 0,
    requestMediaBranches: 0,
    requestJsonMediaBranches: 0,
    requestFormMediaBranches: 0,
    requestTextMediaBranches: 0,
    requestBinaryMediaBranches: 0,
    fetchForbiddenRequestBodies: 0,
    responseMediaBranches: 0,
    responseJsonDecoderBranches: 0,
    responseTextDecoderBranches: 0,
    responseBinaryDecoderBranches: 0,
    defaultNoContentResponseBranches: 0,
    missingMediaSchemas: 0,
    requestMediaSchemaConflicts: 0,
    optionalPathGroups: 0,
    literalOptionalPathGroups: 0,
    non2xxResponses: 0,
    non2xxResponsesMissingBodies: 0,
    responseHeaderUses: 0,
    securityRequirements: 0,
    conditionalOuterPropertyRequiredLosses: 0,
    malformedRequiredNonObjectUses: 0,
    int64SchemaOccurrences: 0,
    cookieParameterUses: 0,
    deepObjectParameterUses: 0,
    allowReservedParameterUses: 0,
    wildcardStatuses: 0,
    requestEncodingUses: 0,
    callbackUses: 0,
    serverVariableDeclarations: 0,
    externalReferenceUses: 0,
  };
}

function collectTraceDiagnostics(
  document: OpenApiDocument,
  provider: string,
  metrics: OpenApiAuditMetrics,
  diagnostics: OpenApiDiagnosticEntry[],
): void {
  const collections: Array<[string, unknown]> = [
    ["paths", document.paths],
    ["x-ms-paths", asObject(document["x-ms-paths"])],
  ];
  for (const [collectionName, paths] of collections) {
    for (const [rawPath, pathItemValue] of objectEntries(paths)) {
      const pathItem = resolveLocalObject(document, pathItemValue);
      if (pathItem?.trace !== undefined) {
        metrics.traceOperationUses++;
        diagnostics.push(diagnostic(
          provider,
          `#/${collectionName}/${pointerToken(rawPath)}/trace`,
          "trace-operation",
          "reject-unsupported-http-method",
        ));
      }
    }
  }
}

function collectOperationUses(document: OpenApiDocument): OperationUse[] {
  const uses: OperationUse[] = [];
  const collections: Array<[string, JsonObject, boolean]> = [
    ["paths", document.paths, false],
    ...((asObject(document["x-ms-paths"])) === undefined
      ? []
      : [["x-ms-paths", asObject(document["x-ms-paths"])!, true] as [
        string,
        JsonObject,
        boolean,
      ]]),
  ];
  for (const [collectionName, paths, embeddedQuery] of collections) {
    for (const [rawPath, pathItemValue] of objectEntries(paths)) {
      const pathItem = resolveLocalObject(document, pathItemValue);
      if (pathItem === undefined) continue;
      for (const method of httpMethods) {
        if (pathItem[method] === undefined) continue;
        const operation = resolveLocalObject(document, pathItem[method]);
        if (operation !== undefined) {
          uses.push({
            collectionName,
            method,
            pointer: `#/${collectionName}/${pointerToken(rawPath)}/${method}`,
            rawPath,
            embeddedQuery,
            pathItem,
            operation,
          });
        }
      }
    }
  }
  return uses;
}

function effectiveParameters(
  document: OpenApiDocument,
  pathParameters: unknown,
  operationParameters: unknown,
  pathItemPointer: string,
  operationPointer: string,
): Map<string, ParameterUse> {
  const result = new Map<string, ParameterUse>();
  const collections: Array<[unknown, string]> = [
    [pathParameters, `${pathItemPointer}/parameters`],
    [operationParameters, `${operationPointer}/parameters`],
  ];
  for (const [values, basePointer] of collections) {
    if (!Array.isArray(values)) continue;
    for (const [index, value] of values.entries()) {
      const parameter = resolveLocalObject(document, value);
      if (parameter === undefined) continue;
      const location = asString(parameter.in);
      const name = asString(parameter.name);
      if (location !== undefined && name !== undefined) {
        result.set(`${location}:${name}`, {
          parameter,
          pointer: `${basePointer}/${index}`,
        });
      }
    }
  }
  return result;
}

function normalizePath(rawPath: string, embeddedQuery: boolean): string {
  let path = embeddedQuery ? rawPath.split("?", 1)[0] : rawPath;
  const escapedOpen = "\u0000OPEN\u0000";
  const escapedClose = "\u0000CLOSE\u0000";
  path = path
    .replaceAll("\\(", escapedOpen)
    .replaceAll("\\)", escapedClose)
    .replaceAll(/[()]/g, "")
    .replaceAll(escapedOpen, "(")
    .replaceAll(escapedClose, ")")
    .replaceAll(/\*([A-Za-z_][A-Za-z\d_]*)/g, "{$1}")
    .replaceAll(/\/{2,}/g, "/");
  return path.startsWith("/") ? path : `/${path}`;
}

type OptionalPathGroupUse = {
  index: number;
  literal: boolean;
  policy:
    | "bind-literal-group-to-adjacent-parameters"
    | "emit-all-or-none-optional-path-group"
    | "expose-typed-include-selector-default-true";
};

function optionalPathGroupUses(rawPath: string, embeddedQuery: boolean): OptionalPathGroupUse[] {
  const sourcePath = embeddedQuery ? rawPath.split("?", 1)[0] : rawPath;
  const parts: Array<{ group: boolean; text: string; index?: number }> = [];
  let text = "";
  let inGroup = false;
  let groupIndex = 0;
  for (let index = 0; index < sourcePath.length; index++) {
    const character = sourcePath[index];
    if (character === "\\" && ["(", ")"].includes(sourcePath[index + 1] ?? "")) {
      text += sourcePath[++index];
    } else if (character === "(") {
      if (inGroup) throw new Error(`${rawPath} contains a nested optional path group`);
      if (text !== "") parts.push({ group: false, text });
      text = "";
      inGroup = true;
    } else if (character === ")") {
      if (!inGroup) throw new Error(`${rawPath} contains an unmatched optional path group close`);
      parts.push({ group: true, index: groupIndex++, text });
      text = "";
      inGroup = false;
    } else {
      text += character;
    }
  }
  if (inGroup) throw new Error(`${rawPath} contains an unclosed optional path group`);
  if (text !== "") parts.push({ group: false, text });

  const parameters = parts.map((part) =>
    part.group
      ? [
        ...new Set([
          ...[...part.text.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]),
          ...[...part.text.matchAll(/\*([A-Za-z_][A-Za-z\d_]*)/g)].map((match) => match[1]),
        ]),
      ]
      : []
  );
  return parts.flatMap((part, partIndex): OptionalPathGroupUse[] => {
    if (!part.group) return [];
    if (parameters[partIndex].length > 0) {
      return [{
        index: part.index!,
        literal: false,
        policy: "emit-all-or-none-optional-path-group",
      }];
    }
    const adjacentParameters = [parameters[partIndex + 1], parameters[partIndex - 1]]
      .find((value) => value !== undefined && value.length > 0);
    return [{
      index: part.index!,
      literal: true,
      policy: adjacentParameters === undefined
        ? "expose-typed-include-selector-default-true"
        : "bind-literal-group-to-adjacent-parameters",
    }];
  });
}

function operationKey(use: OperationUse): string {
  return `${use.collectionName}:${use.method}:${use.rawPath}`;
}

function pathCaptureNames(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}

function collectRequestMediaMetrics(
  metrics: OpenApiAuditMetrics,
  branches: OpenApiRequestMediaBranch[],
  diagnostics: OpenApiDiagnosticEntry[],
  document: OpenApiDocument,
  provider: string,
  use: OperationUse,
  operationId: string,
  normalizedPath: string,
): void {
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

function securityRequirementCount(value: unknown): number {
  return Array.isArray(value) ? value.filter((entry) => asObject(entry) !== undefined).length : 0;
}

function conditionalRequiredLossPointers(
  schema: JsonObject,
  pointer: string,
): string[] {
  const pointers: string[] = [];
  for (const keyword of ["oneOf", "anyOf"] as const) {
    if (!Array.isArray(schema[keyword])) continue;
    for (const [branchIndex, branchValue] of schema[keyword].entries()) {
      const branch = asObject(branchValue);
      if (branch === undefined || !Array.isArray(branch.required)) continue;
      const branchProperties = asObject(branch.properties) ?? {};
      const branchSkipsInheritedProperties = asString(branch.$ref) !== undefined ||
        (Array.isArray(branch.enum) && branch.enum.length > 0) ||
        Object.hasOwn(branch, "const") ||
        branch.type === "array" ||
        branch.items !== undefined;
      for (const [requiredIndex, name] of branch.required.entries()) {
        if (
          typeof name === "string" && !Object.hasOwn(branchProperties, name) &&
          branchSkipsInheritedProperties
        ) {
          pointers.push(
            `${pointer}/${keyword}/${branchIndex}/required/${requiredIndex}`,
          );
        }
      }
    }
  }
  return pointers;
}

function malformedRequiredPointers(schema: JsonObject, pointer: string): string[] {
  if (!Array.isArray(schema.required)) return [];
  const explicitlyNonObject = schema.type === "array" || schema.items !== undefined ||
    schema.type === "string" || schema.type === "integer" || schema.type === "number" ||
    schema.type === "boolean" || schema.type === "null";
  return explicitlyNonObject ? [`${pointer}/required`] : [];
}

function serverVariablePointers(value: unknown, ownerPointer: string): string[] {
  if (!Array.isArray(value)) return [];
  const pointers: string[] = [];
  for (const [serverIndex, serverValue] of value.entries()) {
    const server = asObject(serverValue);
    if (server === undefined) continue;
    for (const [name] of objectEntries(server.variables)) {
      pointers.push(
        `${ownerPointer}/servers/${serverIndex}/variables/${pointerToken(name)}`,
      );
    }
  }
  return pointers;
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

function assertUniqueMediaKeys(
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

function diagnostic(
  provider: string,
  pointer: string,
  kind: OpenApiDiagnosticKind,
  policy: string,
): OpenApiDiagnosticEntry {
  return [provider, pointer, kind, policy];
}

function pointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function compareDiagnosticEntries(
  left: OpenApiDiagnosticEntry,
  right: OpenApiDiagnosticEntry,
): number {
  for (let index = 0; index < left.length; index++) {
    const comparison = compareText(left[index], right[index]);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function compareMediaBranches(
  left: { key: string; pointer: string },
  right: { key: string; pointer: string },
): number {
  return compareText(left.key, right.key) || compareText(left.pointer, right.pointer);
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactNumericStatus(value: string): number | undefined {
  if (!/^\d{3}$/.test(value)) return undefined;
  const status = Number(value);
  return Number.isInteger(status) ? status : undefined;
}

function isWildcardStatus(value: string): boolean {
  return /^[1-5]XX$/i.test(value);
}

function resolveLocalObject(document: OpenApiDocument, value: unknown): JsonObject | undefined {
  let current = asObject(value);
  const visited = new Set<string>();
  while (current !== undefined) {
    const reference = asString(current.$ref);
    if (reference === undefined) return current;
    if (!reference.startsWith("#/")) return undefined;
    if (visited.has(reference)) {
      throw new Error(`Circular local OpenAPI reference: ${reference}`);
    }
    visited.add(reference);
    current = asObject(resolveLocalReference(document, reference));
  }
  return undefined;
}

function walkObjects(
  value: unknown,
  pointer: string,
  visit: (value: JsonObject, pointer: string) => void,
): void {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      walkObjects(entry, `${pointer}/${index}`, visit);
    }
    return;
  }
  const object = asObject(value);
  if (object === undefined) return;
  visit(object, pointer);
  for (const [name, entry] of Object.entries(object)) {
    walkObjects(entry, `${pointer}/${pointerToken(name)}`, visit);
  }
}
