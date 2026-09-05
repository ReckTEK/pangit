import type { Provider, ProviderTypeRegistry, ProviderVersion } from "../provider.ts";

import type { ProviderReleaseEntityNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { Page, ResolvedPageRequest } from "../pagination.ts";
import type { RepositoryData } from "../repositories.ts";

export type { ProviderReleaseEntityNative } from "../../native-access/ProviderNativeRegistry.ts";

export interface ReleaseData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
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
  readonly native: ProviderReleaseEntityNative<TProvider, TVersion, "release", TRegistry>;
}

export interface ReleaseAssetData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id: string;
  readonly name: string;
  readonly size?: number | bigint;
  readonly downloadCount?: number | bigint;
  readonly downloadUrl?: string;
  readonly createdAt?: string;
  readonly native: ProviderReleaseEntityNative<TProvider, TVersion, "releaseAsset", TRegistry>;
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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly releaseSupport: ReleaseCapabilitySupport;
  listReleases(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    request: ResolvedPageRequest,
  ): Promise<Page<ReleaseData<TProvider, TVersion, TRegistry>>>;
  getRelease(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    id: string,
    options?: OperationOptions,
  ): Promise<ReleaseData<TProvider, TVersion, TRegistry>>;
  getReleaseByTag(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    tagName: string,
    options?: OperationOptions,
  ): Promise<ReleaseData<TProvider, TVersion, TRegistry>>;
  createRelease(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    input: CreateReleaseInput,
    options?: OperationOptions,
  ): Promise<ReleaseData<TProvider, TVersion, TRegistry>>;
  updateRelease(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    release: ReleaseData<TProvider, TVersion, TRegistry>,
    input: UpdateReleaseInput,
    options?: OperationOptions,
  ): Promise<ReleaseData<TProvider, TVersion, TRegistry>>;
  deleteRelease(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    release: ReleaseData<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<void>;
  listReleaseAssets(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    release: ReleaseData<TProvider, TVersion, TRegistry>,
    options: ListReleaseAssetsOptions,
  ): Promise<readonly ReleaseAssetData<TProvider, TVersion, TRegistry>[]>;
  getReleaseAsset(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    release: ReleaseData<TProvider, TVersion, TRegistry>,
    id: string,
    options?: OperationOptions,
  ): Promise<ReleaseAssetData<TProvider, TVersion, TRegistry>>;
  uploadReleaseAsset(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    release: ReleaseData<TProvider, TVersion, TRegistry>,
    input: UploadReleaseAssetInput,
    options?: OperationOptions,
  ): Promise<ReleaseAssetData<TProvider, TVersion, TRegistry>>;
  updateReleaseAsset(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    release: ReleaseData<TProvider, TVersion, TRegistry>,
    asset: ReleaseAssetData<TProvider, TVersion, TRegistry>,
    input: UpdateReleaseAssetInput,
    options?: OperationOptions,
  ): Promise<ReleaseAssetData<TProvider, TVersion, TRegistry>>;
  deleteReleaseAsset(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    release: ReleaseData<TProvider, TVersion, TRegistry>,
    asset: ReleaseAssetData<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<void>;
}
