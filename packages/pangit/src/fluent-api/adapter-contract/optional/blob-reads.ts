import type { Provider, ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type { ProviderBlobNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { RepositoryData } from "../repositories.ts";

export type { ProviderBlobNative } from "../../native-access/ProviderNativeRegistry.ts";

/** Provider-neutral result of reading one Git blob by object ID. */
export interface BlobData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly sha: string;
  readonly size: number;
  readonly bytes: Uint8Array;
  readonly native: ProviderBlobNative<TProvider, TVersion>;
}

export interface BlobReadCapabilitySupport {
  readonly supported: boolean;
  readonly operations: Readonly<{ readonly get: "direct" }>;
}

/** Optional, direct SHA-addressed blob-read contract. */
export interface BlobReadAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly blobReadSupport: BlobReadCapabilitySupport;
  getBlob(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    options?: OperationOptions,
  ): Promise<BlobData<TProvider, TVersion>>;
}
