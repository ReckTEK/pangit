import type { Provider, ProviderVersion } from "../provider.ts";
import type { ProviderReleaseEntityNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { Page, ResolvedPageRequest } from "../pagination.ts";
import type { RepositoryData } from "../repositories.ts";

export type { ProviderReleaseEntityNative } from "../../native-access/ProviderNativeRegistry.ts";

export interface ReleaseData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly tagName: string;
  readonly name?: string;
  readonly description?: string;
  readonly author?: string;
  readonly draft: boolean;
  readonly prerelease: boolean;
  readonly target?: string;
  readonly createdAt?: string;
  readonly publishedAt?: string;
  readonly url?: string;
  readonly native: ProviderReleaseEntityNative<TProvider, TVersion, "release">;
}

export interface ReleaseAssetData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly name: string;
  readonly size?: number | bigint;
  readonly downloadCount?: number | bigint;
  readonly downloadUrl?: string;
  readonly createdAt?: string;
  readonly native: ProviderReleaseEntityNative<TProvider, TVersion, "releaseAsset">;
}

export interface CreateReleaseInput {
  readonly tagName: string;
  readonly name?: string;
  readonly description?: string;
  readonly draft?: boolean;
  readonly prerelease?: boolean;
  readonly target?: string;
}

export interface UpdateReleaseInput {
  readonly name?: string;
  readonly description?: string;
  readonly draft?: boolean;
  readonly prerelease?: boolean;
}

export interface ListReleaseAssetsOptions extends OperationOptions {
  /** Fail instead of accepting a provider's unpaged result above this explicit ceiling. */
  readonly maxItems: number;
}

export interface UploadReleaseAssetInput {
  readonly name: string;
  readonly data: ArrayBuffer | Blob | Uint8Array;
}

export interface UpdateReleaseAssetInput {
  readonly name: string;
}

export type ReleaseCapabilityOperation =
  | "list"
  | "get"
  | "get-by-tag"
  | "create"
  | "update"
  | "delete"
  | "list-assets"
  | "get-asset"
  | "upload-asset"
  | "update-asset"
  | "delete-asset";

/** Static support and efficiency metadata for releases and their separate asset sub-capability. */
export interface ReleaseCapabilitySupport {
  readonly supported: boolean;
  readonly operations: Readonly<
    Record<ReleaseCapabilityOperation, "direct" | "one-page" | "direct-bounded-result" | "bounded">
  >;
  readonly signing: "native-only";
}

/** Optional shared releases and release-assets capability implemented by a provider adapter. */
export interface ReleaseAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly releaseSupport: ReleaseCapabilitySupport;
  listReleases(
    repository: RepositoryData<TProvider, TVersion>,
    request: ResolvedPageRequest,
  ): Promise<Page<ReleaseData<TProvider, TVersion>>>;
  getRelease(
    repository: RepositoryData<TProvider, TVersion>,
    id: string,
    options?: OperationOptions,
  ): Promise<ReleaseData<TProvider, TVersion>>;
  getReleaseByTag(
    repository: RepositoryData<TProvider, TVersion>,
    tagName: string,
    options?: OperationOptions,
  ): Promise<ReleaseData<TProvider, TVersion>>;
  createRelease(
    repository: RepositoryData<TProvider, TVersion>,
    input: CreateReleaseInput,
    options?: OperationOptions,
  ): Promise<ReleaseData<TProvider, TVersion>>;
  updateRelease(
    repository: RepositoryData<TProvider, TVersion>,
    release: ReleaseData<TProvider, TVersion>,
    input: UpdateReleaseInput,
    options?: OperationOptions,
  ): Promise<ReleaseData<TProvider, TVersion>>;
  deleteRelease(
    repository: RepositoryData<TProvider, TVersion>,
    release: ReleaseData<TProvider, TVersion>,
    options?: OperationOptions,
  ): Promise<void>;
  listReleaseAssets(
    repository: RepositoryData<TProvider, TVersion>,
    release: ReleaseData<TProvider, TVersion>,
    options: ListReleaseAssetsOptions,
  ): Promise<readonly ReleaseAssetData<TProvider, TVersion>[]>;
  getReleaseAsset(
    repository: RepositoryData<TProvider, TVersion>,
    release: ReleaseData<TProvider, TVersion>,
    id: string,
    options?: OperationOptions,
  ): Promise<ReleaseAssetData<TProvider, TVersion>>;
  uploadReleaseAsset(
    repository: RepositoryData<TProvider, TVersion>,
    release: ReleaseData<TProvider, TVersion>,
    input: UploadReleaseAssetInput,
    options?: OperationOptions,
  ): Promise<ReleaseAssetData<TProvider, TVersion>>;
  updateReleaseAsset(
    repository: RepositoryData<TProvider, TVersion>,
    release: ReleaseData<TProvider, TVersion>,
    asset: ReleaseAssetData<TProvider, TVersion>,
    input: UpdateReleaseAssetInput,
    options?: OperationOptions,
  ): Promise<ReleaseAssetData<TProvider, TVersion>>;
  deleteReleaseAsset(
    repository: RepositoryData<TProvider, TVersion>,
    release: ReleaseData<TProvider, TVersion>,
    asset: ReleaseAssetData<TProvider, TVersion>,
    options?: OperationOptions,
  ): Promise<void>;
}
