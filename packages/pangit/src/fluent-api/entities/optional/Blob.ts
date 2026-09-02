import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type { BlobData, ProviderBlobNative } from "../../adapter-contract/optional/blob-reads.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface Blob<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
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
    get bytes(): Readonly<Uint8Array> {
      return bytes.slice();
    },
    native: data.native,
  });
}
