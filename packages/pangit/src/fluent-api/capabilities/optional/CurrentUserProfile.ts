import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";
import type {
  CurrentUserProfileAdapter,
  CurrentUserProfileCapabilitySupport,
} from "../../adapter-contract/optional/current-user-profile.ts";

import type { OperationOptions } from "../../adapter-contract/operation-options.ts";
import {
  createCurrentUserProfileEntity,
  type CurrentUserProfile,
} from "../../entities/optional/CurrentUserProfile.ts";

export interface CurrentUserProfileCapability<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly support: CurrentUserProfileCapabilitySupport;
  current(options?: OperationOptions): Promise<CurrentUserProfile<TProvider, TVersion>>;
}

export function createCurrentUserProfileCapability<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: CurrentUserProfileAdapter<TProvider, TVersion>,
): CurrentUserProfileCapability<TProvider, TVersion> {
  return Object.freeze({
    support: adapter.currentUserProfileSupport,
    async current(options: OperationOptions = {}) {
      return createCurrentUserProfileEntity(await adapter.getCurrentUserProfile(options));
    },
  });
}
