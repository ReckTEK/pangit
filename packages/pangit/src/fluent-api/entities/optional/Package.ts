import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  PackageFileData,
  PackageFileDigests,
  PackageVersionData,
  ProviderPackageEntityNative,
} from "../../adapter-contract/optional/packages.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface PackageVersion<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly owner: string;
  readonly type: string;
  readonly name: string;
  readonly version: string;
  readonly createdAt?: string;
  readonly creator?: string;
  readonly repositoryFullName?: string;
  readonly url?: string;
  readonly native: ProviderPackageEntityNative<TProvider, TVersion, "package">;
}

export interface PackageFile<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly name: string;
  readonly size?: number;
  readonly digests: Readonly<PackageFileDigests>;
  readonly native: ProviderPackageEntityNative<TProvider, TVersion, "packageFile">;
}

export function createPackageVersion<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: PackageVersionData<TProvider, TVersion>): PackageVersion<TProvider, TVersion> {
  return Object.freeze({ ...data });
}

export function createPackageFile<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: PackageFileData<TProvider, TVersion>): PackageFile<TProvider, TVersion> {
  return Object.freeze({ ...data, digests: Object.freeze({ ...data.digests }) });
}
