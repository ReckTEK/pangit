import type { Provider, ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type { ProviderPackageEntityNative } from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { Page, ResolvedPageRequest } from "../pagination.ts";

export type { ProviderPackageEntityNative } from "../../native-access/ProviderNativeRegistry.ts";

/** Package name without a version. Formats remain strings because registries evolve independently. */
export interface PackageCoordinates {
  readonly owner: string;
  readonly type: string;
  readonly name: string;
}

/** Exact package-version identity. */
export interface PackageVersionIdentity extends PackageCoordinates {
  readonly version: string;
}

export interface PackageVersionData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> extends PackageVersionIdentity {
  readonly id: string;
  readonly createdAt?: string;
  readonly creator?: string;
  readonly repositoryFullName?: string;
  readonly url?: string;
  readonly native: ProviderPackageEntityNative<TProvider, TVersion, "package">;
}

export interface PackageFileDigests {
  readonly md5?: string;
  readonly sha1?: string;
  readonly sha256?: string;
  readonly sha512?: string;
}

export interface PackageFileData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly name: string;
  readonly size?: number;
  readonly digests: Readonly<PackageFileDigests>;
  readonly native: ProviderPackageEntityNative<TProvider, TVersion, "packageFile">;
}

export interface ListPackagesRequest extends ResolvedPageRequest {
  readonly query?: string;
  readonly type?: string;
}

/** Gitea's package-file endpoint is direct but unpaginated, so the caller supplies a hard bound. */
export interface ListPackageFilesOptions extends OperationOptions {
  readonly maxFiles: number;
}

export type PackageCapabilityOperation =
  | "list-packages"
  | "list-versions"
  | "get-version"
  | "find-version"
  | "list-files"
  | "delete-version"
  | "delete-package";

/** Static metadata for the conservative metadata/read/delete package intersection. */
export interface PackageCapabilitySupport {
  readonly supported: boolean;
  readonly operations: Readonly<
    Record<PackageCapabilityOperation, "direct" | "one-page" | "direct-bounded-result">
  >;
  readonly upload: "native-only";
  readonly download: "native-only";
  readonly repositoryLinking: "native-only";
}

/** Optional package metadata and destructive lifecycle contract. */
export interface PackageAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly packageSupport: PackageCapabilitySupport;
  listPackages(
    owner: string,
    request: ListPackagesRequest,
  ): Promise<Page<PackageVersionData<TProvider, TVersion>>>;
  listPackageVersions(
    coordinates: PackageCoordinates,
    request: ResolvedPageRequest,
  ): Promise<Page<PackageVersionData<TProvider, TVersion>>>;
  getPackageVersion(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<PackageVersionData<TProvider, TVersion>>;
  findPackageVersion(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<PackageVersionData<TProvider, TVersion> | undefined>;
  listPackageFiles(
    identity: PackageVersionIdentity,
    options: ListPackageFilesOptions,
  ): Promise<readonly PackageFileData<TProvider, TVersion>[]>;
  deletePackageVersion(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<void>;
  deletePackage(
    coordinates: PackageCoordinates,
    options?: OperationOptions,
  ): Promise<void>;
}
