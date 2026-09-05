import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import type { Page, PageRequest } from "../adapter-contract/pagination.ts";

import type { Auth } from "../auth/authentication-contracts.ts";

import type { CurrentUserProfileCapability } from "../capabilities/optional/CurrentUserProfile.ts";
import type { Packages } from "../capabilities/optional/Packages.ts";
import type { UnsupportedOptionalCapabilities } from "../capabilities/optional/UnsupportedOptionalCapabilities.ts";
import type { RepositoryContainer } from "../entities/RepositoryContainer.ts";

import type { ProviderClientNative } from "../native-access/ProviderNativeRegistry.ts";

/** Fluent API client selected for one implemented provider/version adapter. */
export interface FluentClient<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly auth: Auth<TProvider, TVersion, TRegistry>;
  readonly native: ProviderClientNative<TProvider, TVersion, TRegistry>;
  readonly currentUserProfile: CurrentUserProfileCapability<TProvider, TVersion, TRegistry>;
  readonly packages: Packages<TProvider, TVersion, TRegistry>;
  readonly unsupportedOptionalCapabilities: UnsupportedOptionalCapabilities;

  /** Fetch one bounded page of repository-owning containers. */
  containers(
    request?: PageRequest,
  ): Promise<Page<RepositoryContainer<TProvider, TVersion, TRegistry>>>;
  container(
    name: string,
    options?: OperationOptions,
  ): Promise<RepositoryContainer<TProvider, TVersion, TRegistry>>;
}

export type AuthorizedClient<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = FluentClient<TProvider, TVersion, TRegistry>;
