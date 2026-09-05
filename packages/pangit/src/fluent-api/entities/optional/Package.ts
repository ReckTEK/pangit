import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type {
  PackageFileData,
  PackageFileDigests,
  PackageVersionData,
  ProviderPackageEntityNative,
} from "../../adapter-contract/optional/packages.ts";

export interface PackageVersion<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
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
  readonly native: ProviderPackageEntityNative<TProvider, TVersion, "package", TRegistry>;
}

export interface PackageFile<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id: string;
  readonly name: string;
  readonly size?: number;
  readonly digests: Readonly<PackageFileDigests>;
  readonly native: ProviderPackageEntityNative<TProvider, TVersion, "packageFile", TRegistry>;
}

export function createPackageVersion<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: PackageVersionData<TProvider, TVersion, TRegistry>,
): PackageVersion<TProvider, TVersion, TRegistry> {
  return Object.freeze({ ...data });
}

export function createPackageFile<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: PackageFileData<TProvider, TVersion, TRegistry>,
): PackageFile<TProvider, TVersion, TRegistry> {
  return Object.freeze({ ...data, digests: Object.freeze({ ...data.digests }) });
}
