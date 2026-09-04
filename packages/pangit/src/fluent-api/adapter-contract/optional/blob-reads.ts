import type { Provider, ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type { ProviderBlobNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { ContentBlobOptions, ProviderMediaType } from "../content-body.ts";
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
  readonly mediaType?: ProviderMediaType;
  readonly native: ProviderBlobNative<TProvider, TVersion>;
}

export interface BlobReadCapabilitySupport {
  readonly supported: boolean;
  readonly operations: Readonly<{
    readonly get: "direct";
    readonly readBytes: "direct";
    readonly readText: "direct";
    readonly readJson: "direct";
    readonly readBlob: "direct";
  }>;
}

/** SHA-addressed objects have no filename; callers may supply a MIME type or filename hint. */
export interface ReadGitBlobOptions extends OperationOptions, ContentBlobOptions {}

/** Optional, direct SHA-addressed blob-read contract. */
export interface BlobReadAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly blobReadSupport: BlobReadCapabilitySupport;
  readBlob(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    options?: ReadGitBlobOptions,
  ): Promise<globalThis.Blob>;
  /** Direct SHA-addressed reads using the same body rules as path-addressed content. */
  readBlobBytes(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    options?: OperationOptions,
  ): Promise<Uint8Array>;
  readBlobText(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    options?: OperationOptions,
  ): Promise<string>;
  readBlobJson(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    options?: OperationOptions,
  ): Promise<unknown>;
  getBlob(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    options?: OperationOptions,
  ): Promise<BlobData<TProvider, TVersion>>;
}
