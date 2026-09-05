import type { Provider, ProviderTypeRegistry, ProviderVersion } from "../provider.ts";

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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends PackageVersionIdentity {
  readonly id: string;
  readonly createdAt?: string;
  readonly creator?: string;
  readonly repositoryFullName?: string;
  readonly url?: string;
  readonly native: ProviderPackageEntityNative<TProvider, TVersion, "package", TRegistry>;
}

export interface PackageFileDigests {
  readonly md5?: string;
  readonly sha1?: string;
  readonly sha256?: string;
  readonly sha512?: string;
}

export interface PackageFileData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id: string;
  readonly name: string;
  readonly size?: number;
  readonly digests: Readonly<PackageFileDigests>;
  readonly native: ProviderPackageEntityNative<TProvider, TVersion, "packageFile", TRegistry>;
}

export interface ListPackagesRequest extends ResolvedPageRequest {
  readonly query?: string;
  readonly type?: string;
}

/** A direct package-file endpoint requires an explicit bound on the returned collection. */
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
    Record<PackageCapabilityOperation, "direct" | "one-page" | "direct-bounded-result" | "bounded">
  >;
  readonly upload: "native-only";
  readonly download: "native-only";
  readonly repositoryLinking: "native-only";
}

/** Optional package metadata and destructive lifecycle contract. */
export interface PackageAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly packageSupport: PackageCapabilitySupport;
  listPackages(
    owner: string,
    request: ListPackagesRequest,
  ): Promise<Page<PackageVersionData<TProvider, TVersion, TRegistry>>>;
  listPackageVersions(
    coordinates: PackageCoordinates,
    request: ResolvedPageRequest,
  ): Promise<Page<PackageVersionData<TProvider, TVersion, TRegistry>>>;
  getPackageVersion(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<PackageVersionData<TProvider, TVersion, TRegistry>>;
  findPackageVersion(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<PackageVersionData<TProvider, TVersion, TRegistry> | undefined>;
  listPackageFiles(
    identity: PackageVersionIdentity,
    options: ListPackageFilesOptions,
  ): Promise<readonly PackageFileData<TProvider, TVersion, TRegistry>[]>;
  deletePackageVersion(
    identity: PackageVersionIdentity,
    options?: OperationOptions,
  ): Promise<void>;
  deletePackage(
    coordinates: PackageCoordinates,
    options?: OperationOptions,
  ): Promise<void>;
}
