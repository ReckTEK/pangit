import type { Provider, ProviderTypeRegistry, ProviderVersion } from "../provider.ts";

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

export interface CurrentUserProfileAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly currentUserProfileSupport: CurrentUserProfileCapabilitySupport;
  getCurrentUserProfile(
    options?: OperationOptions,
  ): Promise<CurrentUserProfileData<TProvider, TVersion, TRegistry>>;
}
