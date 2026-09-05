import type { Provider, ProviderVersion } from "../provider.ts";
import type {
  ProviderCurrentUserProfileNative,
} from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";

export type {
  ProviderCurrentUserProfileNative,
} from "../../native-access/ProviderNativeRegistry.ts";

export interface CurrentUserProfileCapabilitySupport {
  readonly supported: boolean;
  readonly current: "direct";
}

/** Provider-neutral authenticated-user identity. */
export interface CurrentUserProfileData<
  TProvider extends Provider,
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

export interface CurrentUserProfileAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly currentUserProfileSupport: CurrentUserProfileCapabilitySupport;
  getCurrentUserProfile(
    options?: OperationOptions,
  ): Promise<CurrentUserProfileData<TProvider, TVersion>>;
}
