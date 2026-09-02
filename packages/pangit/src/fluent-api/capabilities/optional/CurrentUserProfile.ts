import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  CurrentUserProfileAdapter,
  CurrentUserProfileCapabilitySupport,
} from "../../adapter-contract/optional/current-user-profile.ts";
import type { SelectedGitHostAdapter } from "../../adapter-contract/GitHostAdapter.ts";
import type { OperationOptions } from "../../adapter-contract/operation-options.ts";
import {
  createCurrentUserProfileEntity,
  type CurrentUserProfile,
} from "../../entities/optional/CurrentUserProfile.ts";
import type { FluentProvider } from "../../provider-registry.ts";

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

/** Build the client-scoped profile handle without loading the selected provider adapter. */
export function createLazyCurrentUserProfileCapability<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  selectedAdapter: SelectedGitHostAdapter<TProvider, TVersion>,
  support: CurrentUserProfileCapabilitySupport,
): CurrentUserProfileCapability<TProvider, TVersion> {
  return Object.freeze({
    support,
    async current(options: OperationOptions = {}) {
      const adapter = await selectedAdapter();
      return createCurrentUserProfileEntity(await adapter.getCurrentUserProfile(options));
    },
  });
}
