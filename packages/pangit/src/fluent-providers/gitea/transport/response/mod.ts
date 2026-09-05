export type { GiteaOperation, GiteaOperationIdentity, GiteaSuccessResponse } from "./operation.ts";

export {
  requestGitea,
  requestGiteaBody,
  requestGiteaBytes,
  requestGiteaText,
  requestOptionalGiteaBody,
} from "./request.ts";

export type { GiteaCursorValidationContext, GiteaPageCursor } from "./cursor.ts";

export { decodeGiteaPageCursor, encodeGiteaPageCursor } from "./cursor.ts";

export { giteaPagination } from "./pagination.ts";
export { mapGiteaBounded } from "./bounded-map.ts";
export { normalizeGiteaThrown, throwForGiteaHttpResponse } from "./errors.ts";

export { pollGitea } from "./poll.ts";
