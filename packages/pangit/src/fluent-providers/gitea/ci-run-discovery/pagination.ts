import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  type decodeGiteaPageCursor,
  encodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
} from "../transport/response/mod.ts";

export function wrappedPagination<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: Parameters<typeof giteaPagination<TVersion>>[2],
  cursor: ReturnType<typeof decodeGiteaPageCursor>,
  requestedLimit: number,
  itemCount: number,
  wrappedTotal?: number,
): { nextCursor?: string; totalCount?: number } {
  const headerMetadata = giteaPagination(
    context,
    operation,
    response,
    cursor,
    requestedLimit,
    itemCount,
  );
  const totalCount = headerMetadata.totalCount ?? wrappedTotal;
  if (headerMetadata.nextCursor !== undefined || totalCount === undefined) {
    return { ...headerMetadata, ...(totalCount === undefined ? {} : { totalCount }) };
  }
  const effectiveLimit = cursor.effectiveLimit ??
    (itemCount > 0 && itemCount < requestedLimit && totalCount > itemCount
      ? itemCount
      : requestedLimit);
  const consumed = (cursor.page - 1) * effectiveLimit + itemCount;
  return {
    ...(consumed < totalCount && itemCount > 0
      ? {
        nextCursor: encodeGiteaPageCursor(
          { page: cursor.page + 1, effectiveLimit },
          { version: context.version, operation },
        ),
      }
      : {}),
    totalCount,
  };
}
