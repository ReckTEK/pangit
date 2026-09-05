import { ValidationError } from "../../../../fluent-api/adapter-contract/errors.ts";
import { requirePositiveInteger } from "../../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaVersion } from "../../native/GiteaEntityNative.ts";
import { type GiteaOperation, universalOperation } from "./operation.ts";

/** Opaque Gitea page state; provider page numbers never leak into the universal API. */
export interface GiteaPageCursor {
  readonly page: number;
  readonly effectiveLimit?: number;
}

export interface GiteaCursorValidationContext {
  readonly version?: GiteaVersion;
  readonly operation?: GiteaOperation;
}

export function decodeGiteaPageCursor(
  cursor?: string,
  context: GiteaCursorValidationContext = {},
): GiteaPageCursor {
  if (cursor === undefined) return Object.freeze({ page: 1 });
  const match = /^gitea-page:(\d+)(?::(\d+))?$/.exec(cursor);
  const errorContext = cursorErrorContext(context, "decodePageCursor");
  if (match === null) {
    throw new ValidationError("invalid Gitea page cursor", errorContext);
  }
  return Object.freeze({
    page: requirePositiveInteger(Number(match[1]), "Gitea cursor page", errorContext),
    ...(match[2] === undefined ? {} : {
      effectiveLimit: requirePositiveInteger(
        Number(match[2]),
        "Gitea cursor limit",
        errorContext,
      ),
    }),
  });
}

export function encodeGiteaPageCursor(
  cursor: GiteaPageCursor,
  context: GiteaCursorValidationContext = {},
): string {
  const errorContext = cursorErrorContext(context, "encodePageCursor");
  requirePositiveInteger(cursor.page, "Gitea cursor page", errorContext);
  if (cursor.effectiveLimit !== undefined) {
    requirePositiveInteger(cursor.effectiveLimit, "Gitea cursor limit", errorContext);
  }
  return `gitea-page:${cursor.page}${
    cursor.effectiveLimit === undefined ? "" : `:${cursor.effectiveLimit}`
  }`;
}

function cursorErrorContext(
  context: GiteaCursorValidationContext,
  fallbackOperation: string,
) {
  return {
    provider: "gitea" as const,
    ...(context.version === undefined ? {} : { version: context.version }),
    operation: context.operation === undefined
      ? fallbackOperation
      : universalOperation(context.operation),
  };
}
