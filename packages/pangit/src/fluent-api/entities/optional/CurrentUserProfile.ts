import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  CurrentUserProfileData,
  ProviderCurrentUserProfileNative,
} from "../../adapter-contract/optional/current-user-profile.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface CurrentUserProfile<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly username: string;
  readonly displayName?: string;
  readonly email?: string;
  readonly avatarUrl?: string;
  readonly webUrl?: string;
  readonly native: ProviderCurrentUserProfileNative<TProvider, TVersion>;
}

export function createCurrentUserProfileEntity<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  data: CurrentUserProfileData<TProvider, TVersion>,
): CurrentUserProfile<TProvider, TVersion> {
  return Object.freeze({ ...data, native: data.native });
}
