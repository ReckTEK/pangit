import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type {
  CurrentUserProfileData,
  ProviderCurrentUserProfileNative,
} from "../../adapter-contract/optional/current-user-profile.ts";

export interface CurrentUserProfile<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id: string;
  readonly username: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly avatarUrl?: string;
  readonly webUrl?: string;
  readonly native: ProviderCurrentUserProfileNative<TProvider, TVersion, TRegistry>;
}

export function createCurrentUserProfileEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: CurrentUserProfileData<TProvider, TVersion, TRegistry>,
): CurrentUserProfile<TProvider, TVersion, TRegistry> {
  return Object.freeze({ ...data, native: data.native });
}
