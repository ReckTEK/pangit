import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaVersion } from "../../native/GiteaEntityNative.ts";
import type { GiteaOperation, GiteaSuccessResponse } from "./operation.ts";

import { encodeGiteaPageCursor, type GiteaPageCursor } from "./cursor.ts";
import { nextPageFromLink, parseBooleanHeader, parseFirstNonNegativeHeader } from "./headers.ts";

/** Read native Gitea pagination headers without trusting incomplete generated header maps. */
export function giteaPagination<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  response: GiteaSuccessResponse,
  cursor: GiteaPageCursor,
  requestedLimit: number,
  itemCount: number,
): { readonly nextCursor?: string; readonly totalCount?: number } {
  const totalCount = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-total-count",
    "x-total",
  );
  const reportedPage = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-page",
  );
  const pageCount = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-pagecount",
  );
  const reportedLimit = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-perpage",
  );
  const hasMore = parseBooleanHeader(
    context,
    operation,
    response.headers,
    response,
    "x-hasmore",
  );
  const linkedPage = nextPageFromLink(response.headers.get("link"));
  const effectiveLimit = cursor.effectiveLimit ??
    (reportedLimit === undefined || reportedLimit === 0 ? undefined : reportedLimit) ??
    (itemCount > 0 && itemCount < requestedLimit && totalCount !== undefined &&
        totalCount > itemCount
      ? itemCount
      : requestedLimit);
  const consumed = (cursor.page - 1) * effectiveLimit + itemCount;
  const currentPage = reportedPage === undefined || reportedPage < 1 ? cursor.page : reportedPage;
  const nextPage = linkedPage ??
    (hasMore === true
      ? currentPage + 1
      : hasMore === false
      ? undefined
      : pageCount !== undefined && currentPage < pageCount
      ? currentPage + 1
      : itemCount > 0 && totalCount !== undefined && consumed < totalCount
      ? cursor.page + 1
      : undefined);
  return Object.freeze({
    ...(nextPage === undefined ? {} : {
      nextCursor: encodeGiteaPageCursor(
        { page: nextPage, effectiveLimit },
        { version: context.version, operation },
      ),
    }),
    ...(totalCount === undefined ? {} : { totalCount }),
  });
}
