import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  type decodeForgejoPageCursor,
  encodeForgejoPageCursor,
  type ForgejoOperationIdentity,
  forgejoPagination,
} from "../transport/response/mod.ts";

export function wrappedPagination<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  response: Parameters<typeof forgejoPagination<TVersion>>[2],
  cursor: ReturnType<typeof decodeForgejoPageCursor>,
  requestedLimit: number,
  itemCount: number,
  wrappedTotal?: number,
): { nextCursor?: string; totalCount?: number } {
  const headerMetadata = forgejoPagination(
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
        nextCursor: encodeForgejoPageCursor(
          { page: cursor.page + 1, effectiveLimit },
          { version: context.version, operation },
        ),
      }
      : {}),
    totalCount,
  };
}
