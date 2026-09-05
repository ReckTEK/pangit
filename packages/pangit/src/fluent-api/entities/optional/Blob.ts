import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";
import type { BlobData, ProviderBlobNative } from "../../adapter-contract/optional/blob-reads.ts";
import type { ReadableContentBody } from "../../adapter-contract/content-body.ts";
import { createContentBody } from "../../content-body.ts";

export interface Blob<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> extends ReadableContentBody {
  readonly sha: string;
  readonly size: number;
  readonly bytes: Readonly<Uint8Array>;
  readonly native: ProviderBlobNative<TProvider, TVersion>;
}

export function createBlob<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: BlobData<TProvider, TVersion>): Blob<TProvider, TVersion> {
  const bytes = data.bytes.slice();
  return Object.freeze({
    ...data,
    ...createContentBody({
      bytes,
      ...(data.mediaType === undefined ? {} : { mediaType: { ...data.mediaType } }),
    }, "blob"),
    get bytes(): Readonly<Uint8Array> {
      return bytes.slice();
    },
    native: data.native,
  });
}
