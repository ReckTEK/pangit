import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type {
  ProviderReleaseEntityNative,
  ReleaseAssetData,
  ReleaseData,
} from "../../adapter-contract/optional/releases.ts";

export interface Release<
  TProvider extends FluentProvider,
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

export interface ReleaseAsset<
  TProvider extends FluentProvider,
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

export function createReleaseEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(data: ReleaseData<TProvider, TVersion, TRegistry>): Release<TProvider, TVersion, TRegistry> {
  return Object.freeze({ ...data, native: data.native });
}

export function createReleaseAssetEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: ReleaseAssetData<TProvider, TVersion, TRegistry>,
): ReleaseAsset<TProvider, TVersion, TRegistry> {
  return Object.freeze({ ...data, native: data.native });
}
