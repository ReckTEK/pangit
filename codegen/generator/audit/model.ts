import type { OpenApiDocument } from "../openapi.ts";
import { compareText } from "../naming.ts";
import type {
  OpenApiRequestBodyFamily,
  OpenApiResponseBodyFamily,
  OpenApiResponseDecoder,
} from "../media_oracle.ts";

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

export interface AuditContext {
  document: OpenApiDocument;
  provider: string;
  metrics: OpenApiAuditMetrics;
  diagnostics: OpenApiDiagnosticEntry[];
}

export function emptyMetrics(): OpenApiAuditMetrics {
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

export function diagnostic(
  provider: string,
  pointer: string,
  kind: OpenApiDiagnosticKind,
  policy: string,
): OpenApiDiagnosticEntry {
  return [provider, pointer, kind, policy];
}

export function compareDiagnosticEntries(
  left: OpenApiDiagnosticEntry,
  right: OpenApiDiagnosticEntry,
): number {
  for (let index = 0; index < left.length; index++) {
    const comparison = compareText(left[index], right[index]);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

export function compareMediaBranches(
  left: { key: string; pointer: string },
  right: { key: string; pointer: string },
): number {
  return compareText(left.key, right.key) || compareText(left.pointer, right.pointer);
}
