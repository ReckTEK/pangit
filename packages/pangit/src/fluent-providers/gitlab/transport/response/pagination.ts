import { ProviderInvariantError } from "../../../../fluent-api/adapter-contract/errors.ts";
import type { GitLabAdapterContext } from "../GitLabAdapterContext.ts";
import type { GitLabVersion } from "../../native/GitLabNative.ts";
import type { GitLabOperation, GitLabSuccessResponse } from "./operation.ts";

import { encodeGitLabPageCursor, type GitLabPageCursor } from "./cursor.ts";
import { nextPageFromLink, parseBooleanHeader, parseFirstNonNegativeHeader } from "./headers.ts";

/** Read native GitLab pagination headers without trusting incomplete generated header maps. */
export function gitlabPagination<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  response: GitLabSuccessResponse,
  cursor: GitLabPageCursor,
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
    "x-total-pages",
  );
  const reportedLimit = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-per-page",
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
  const explicitNext = response.headers.get("x-next-page");
  if (
    explicitNext !== null && explicitNext !== "" &&
    (!/^\d+$/.test(explicitNext) || !Number.isSafeInteger(Number(explicitNext)) ||
      Number(explicitNext) <= cursor.page)
  ) {
    throw new ProviderInvariantError("GitLab returned an invalid x-next-page continuation", {
      provider: "gitlab",
      version: context.version,
      operation: operation.universal,
      status: response.status,
      cause: response,
    });
  }
  const nextPage = explicitNext === "" ? undefined : linkedPage ??
    (explicitNext !== null && /^\d+$/.test(explicitNext) && Number(explicitNext) > currentPage
      ? Number(explicitNext)
      : undefined) ??
    (hasMore === true
      ? currentPage + 1
      : hasMore === false
      ? undefined
      : pageCount !== undefined && currentPage < pageCount
      ? currentPage + 1
      : itemCount > 0 && totalCount !== undefined && consumed < totalCount
      ? cursor.page + 1
      : itemCount === effectiveLimit && totalCount === undefined && pageCount === undefined
      ? currentPage + 1
      : undefined);
  if (
    nextPage !== undefined &&
    (itemCount === 0 || !Number.isSafeInteger(nextPage) || nextPage <= cursor.page)
  ) {
    throw new ProviderInvariantError("GitLab returned a non-progressing pagination continuation", {
      provider: "gitlab",
      version: context.version,
      operation: operation.universal,
      status: response.status,
      cause: response,
    });
  }
  return Object.freeze({
    ...(nextPage === undefined ? {} : {
      nextCursor: encodeGitLabPageCursor(
        { page: nextPage, effectiveLimit },
        { version: context.version, operation },
      ),
    }),
    ...(totalCount === undefined ? {} : { totalCount }),
  });
}
