import { ValidationError } from "../../../../fluent-api/adapter-contract/errors.ts";
import { requirePositiveInteger } from "../../../../fluent-api/adapter-contract/operation-options.ts";

import type { GitLabVersion } from "../../native/GitLabNative.ts";
import { type GitLabOperation, universalOperation } from "./operation.ts";

/** Opaque GitLab page state; provider page numbers never leak into the universal API. */
export interface GitLabPageCursor {
  readonly page: number;
  readonly effectiveLimit?: number;
}

export interface GitLabCursorValidationContext {
  readonly version?: GitLabVersion;
  readonly operation?: GitLabOperation;
}

export function decodeGitLabPageCursor(
  cursor?: string,
  context: GitLabCursorValidationContext = {},
): GitLabPageCursor {
  if (cursor === undefined) return Object.freeze({ page: 1 });
  const match = /^gitlab-page:(\d+)(?::(\d+))?$/.exec(cursor);
  const errorContext = cursorErrorContext(context, "decodePageCursor");
  if (match === null) {
    throw new ValidationError("invalid GitLab page cursor", errorContext);
  }
  return Object.freeze({
    page: requirePositiveInteger(Number(match[1]), "GitLab cursor page", errorContext),
    ...(match[2] === undefined ? {} : {
      effectiveLimit: requirePositiveInteger(
        Number(match[2]),
        "GitLab cursor limit",
        errorContext,
      ),
    }),
  });
}

export function encodeGitLabPageCursor(
  cursor: GitLabPageCursor,
  context: GitLabCursorValidationContext = {},
): string {
  const errorContext = cursorErrorContext(context, "encodePageCursor");
  requirePositiveInteger(cursor.page, "GitLab cursor page", errorContext);
  if (cursor.effectiveLimit !== undefined) {
    requirePositiveInteger(cursor.effectiveLimit, "GitLab cursor limit", errorContext);
  }
  return `gitlab-page:${cursor.page}${
    cursor.effectiveLimit === undefined ? "" : `:${cursor.effectiveLimit}`
  }`;
}

function cursorErrorContext(
  context: GitLabCursorValidationContext,
  fallbackOperation: string,
) {
  return {
    provider: "gitlab" as const,
    ...(context.version === undefined ? {} : { version: context.version }),
    operation: context.operation === undefined
      ? fallbackOperation
      : universalOperation(context.operation),
  };
}
