import { type OperationOptions, requirePositiveInteger } from "./operation-options.ts";
import { ValidationError, type ValidationErrorContext } from "./errors.ts";

/** One caller-controlled provider page request. */
export interface PageRequest extends OperationOptions {
  /** Maximum items requested when starting pagination; a cursor retains its native page size. */
  readonly limit?: number;
  /** Opaque continuation cursor returned by the preceding page; retains its native page size. */
  readonly cursor?: string;
}

/** One bounded page that preserves provider order. */
export interface Page<TItem> {
  /** Items returned by this provider page in provider order. */
  readonly items: readonly TItem[];
  /** Opaque cursor for the next page when the provider proves one exists. */
  readonly nextCursor?: string;
  /** Provider-reported collection size when available. */
  readonly totalCount?: number;
}

/** A bounded derived page that states whether its requested search was exhaustive. */
export interface ScanPage<TItem> extends Page<TItem> {
  readonly complete: boolean;
}

/** Validated page request with a concrete provider-independent limit. */
export interface ResolvedPageRequest extends OperationOptions {
  readonly limit: number;
  readonly cursor?: string;
}

/** Validate a public page request before selecting or calling an adapter. */
export function resolvePageRequest(
  request: PageRequest = {},
  defaultLimit = 50,
  context: ValidationErrorContext = { operation: "validatePageRequest" },
): ResolvedPageRequest {
  return Object.freeze({
    limit: requirePositiveInteger(request.limit ?? defaultLimit, "page limit", context),
    ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
    ...(request.signal === undefined ? {} : { signal: request.signal }),
  });
}

/** Freeze one page and its item collection at the adapter boundary. */
export function createPage<TItem>(
  items: readonly TItem[],
  metadata: { readonly nextCursor?: string; readonly totalCount?: number } = {},
): Page<TItem> {
  return Object.freeze({
    items: Object.freeze([...items]),
    ...(metadata.nextCursor === undefined ? {} : { nextCursor: metadata.nextCursor }),
    ...(metadata.totalCount === undefined ? {} : { totalCount: metadata.totalCount }),
  });
}

/** Preserve offset continuity while enforcing the caller's inspection ceiling. */
export function resolveBoundedPageLimit(
  request: ResolvedPageRequest & { readonly maxItems?: number },
  cursorLimit: number | undefined,
  context: ValidationErrorContext,
): number {
  const limit = requirePositiveInteger(request.limit, "page limit", context);
  if (request.maxItems === undefined) return cursorLimit ?? limit;
  const maximum = requirePositiveInteger(request.maxItems, "maxItems", context);
  if (cursorLimit !== undefined && cursorLimit > maximum) {
    throw new ValidationError(
      "maxItems cannot be smaller than the continuation page size",
      context,
    );
  }
  return cursorLimit ?? Math.min(limit, maximum);
}
