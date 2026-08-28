import type { OpenApiDocument } from "./openapi.ts";
import { auditDocumentSchemas } from "./audit/document.ts";
import { assertUniqueMediaKeys, collectRequestMedia, collectResponseMedia } from "./audit/media.ts";
import {
  type AuditContext,
  compareDiagnosticEntries,
  compareMediaBranches,
  emptyMetrics,
  type OpenApiDefaultNoContentResponseBranch,
  type OpenApiDiagnosticEntry,
  type OpenApiDocumentAudit,
  type OpenApiRequestMediaBranch,
  type OpenApiResponseMediaBranch,
} from "./audit/model.ts";
import {
  auditOperationUse,
  collectOperationUses,
  collectTraceDiagnostics,
} from "./audit/operations.ts";

export type {
  OpenApiAuditMetrics,
  OpenApiDefaultNoContentResponseBranch,
  OpenApiDiagnosticEntry,
  OpenApiDiagnosticKind,
  OpenApiDocumentAudit,
  OpenApiRequestMediaBranch,
  OpenApiResponseMediaBranch,
} from "./audit/model.ts";
export { requestMediaBranchKey, responseMediaBranchKey } from "./audit/media.ts";
export {
  type OpenApiRequestBodyFamily,
  type OpenApiResponseBodyFamily,
  type OpenApiResponseDecoder,
  reviewedRequestMediaPolicy,
  reviewedResponseMediaPolicy,
} from "./media_oracle.ts";

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
  const context: AuditContext = { document, provider, metrics, diagnostics };

  const operations = collectOperationUses(document);
  metrics.operations = operations.length;
  collectTraceDiagnostics(context);
  for (const use of operations) {
    const operation = auditOperationUse(context, use);
    collectRequestMedia(context, operation, requestMedia);
    collectResponseMedia(context, operation, responseMedia, defaultNoContentResponses);
  }
  auditDocumentSchemas(context);

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
