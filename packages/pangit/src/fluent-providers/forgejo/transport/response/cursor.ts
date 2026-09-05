import { ValidationError } from "../../../../fluent-api/adapter-contract/errors.ts";
import { requirePositiveInteger } from "../../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoVersion } from "../../native/ForgejoEntityNative.ts";
import { type ForgejoOperation, universalOperation } from "./operation.ts";

/** Opaque Forgejo page state; provider page numbers never leak into the universal API. */
export interface ForgejoPageCursor {
  readonly page: number;
  readonly effectiveLimit?: number;
}

export interface ForgejoCursorValidationContext {
  readonly version?: ForgejoVersion;
  readonly operation?: ForgejoOperation;
}

export function decodeForgejoPageCursor(
  cursor?: string,
  context: ForgejoCursorValidationContext = {},
): ForgejoPageCursor {
  if (cursor === undefined) return Object.freeze({ page: 1 });
  const match = /^forgejo-page:(\d+)(?::(\d+))?$/.exec(cursor);
  const errorContext = cursorErrorContext(context, "decodePageCursor");
  if (match === null) {
    throw new ValidationError("invalid Forgejo page cursor", errorContext);
  }
  return Object.freeze({
    page: requirePositiveInteger(Number(match[1]), "Forgejo cursor page", errorContext),
    ...(match[2] === undefined ? {} : {
      effectiveLimit: requirePositiveInteger(
        Number(match[2]),
        "Forgejo cursor limit",
        errorContext,
      ),
    }),
  });
}

export function encodeForgejoPageCursor(
  cursor: ForgejoPageCursor,
  context: ForgejoCursorValidationContext = {},
): string {
  const errorContext = cursorErrorContext(context, "encodePageCursor");
  requirePositiveInteger(cursor.page, "Forgejo cursor page", errorContext);
  if (cursor.effectiveLimit !== undefined) {
    requirePositiveInteger(cursor.effectiveLimit, "Forgejo cursor limit", errorContext);
  }
  return `forgejo-page:${cursor.page}${
    cursor.effectiveLimit === undefined ? "" : `:${cursor.effectiveLimit}`
  }`;
}

function cursorErrorContext(
  context: ForgejoCursorValidationContext,
  fallbackOperation: string,
) {
  return {
    provider: "forgejo" as const,
    ...(context.version === undefined ? {} : { version: context.version }),
    operation: context.operation === undefined
      ? fallbackOperation
      : universalOperation(context.operation),
  };
}
