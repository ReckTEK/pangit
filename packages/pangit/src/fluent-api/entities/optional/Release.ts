import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  ProviderReleaseEntityNative,
  ReleaseAssetData,
  ReleaseData,
} from "../../adapter-contract/optional/releases.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface Release<
  TProvider extends FluentProvider,
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

export interface ReleaseAsset<
  TProvider extends FluentProvider,
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

export function createReleaseEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: ReleaseData<TProvider, TVersion>): Release<TProvider, TVersion> {
  return Object.freeze({ ...data, native: data.native });
}

export function createReleaseAssetEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: ReleaseAssetData<TProvider, TVersion>): ReleaseAsset<TProvider, TVersion> {
  return Object.freeze({ ...data, native: data.native });
}
