import type { ClientOptions } from "../generated-rest-clients/client-options.ts";
import type { ProviderVersion } from "../generated-rest-clients/git-host.ts";
import type { OAuthTokenData, TokenAuthorizationInput } from "./adapter-contract/authentication.ts";
import { ProviderAdapterUnavailableError } from "./adapter-contract/errors.ts";
import type { GitHostAdapter, SelectedGitHostAdapter } from "./adapter-contract/GitHostAdapter.ts";
import { type OperationOptions, requireIdentity } from "./adapter-contract/operation-options.ts";
import type { Page, PageRequest } from "./adapter-contract/pagination.ts";
import { createPage, resolvePageRequest } from "./adapter-contract/pagination.ts";
import type { Auth } from "./auth/authentication-contracts.ts";
import { createAuth } from "./auth/client-authentication.ts";
import type { OAuthAuthorization, OAuthAuthorizedClient } from "./auth/oauth-contracts.ts";
import {
  createLazyCurrentUserProfileCapability,
  type CurrentUserProfileCapability,
} from "./capabilities/optional/CurrentUserProfile.ts";
import { createLazyPackages, type Packages } from "./capabilities/optional/Packages.ts";
import {
  createUnsupportedOptionalCapabilities,
  type UnsupportedOptionalCapabilities,
} from "./capabilities/optional/UnsupportedOptionalCapabilities.ts";
import {
  createRepositoryContainer,
  type RepositoryContainer,
} from "./entities/RepositoryContainer.ts";
import { createClientNativeAccess } from "./native-access/NativeAccess.ts";
import type { ProviderClientNative } from "./native-access/ProviderNativeRegistry.ts";
import {
  type FluentProvider,
  fluentProviderVersions,
  getFluentClientCapabilitySupport,
  isFluentProvider,
} from "./provider-registry.ts";
import { selectGitHostAdapter } from "./select-git-host-adapter.ts";

/** Provider-neutral fluent configuration. OAuth may need an explicit browser-facing host root. */
export interface FluentClientOptions extends ClientOptions {
  readonly webBaseUrl?: string | URL;
}

/** Fluent API client selected for one implemented provider/version adapter. */
export interface FluentClient<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly auth: Auth<TProvider, TVersion>;
  readonly native: ProviderClientNative<TProvider, TVersion>;
  readonly currentUserProfile: CurrentUserProfileCapability<TProvider, TVersion>;
  readonly packages: Packages<TProvider, TVersion>;
  readonly unsupportedOptionalCapabilities: UnsupportedOptionalCapabilities;

  /** Fetch one bounded page of repository-owning containers. */
  containers(request?: PageRequest): Promise<Page<RepositoryContainer<TProvider, TVersion>>>;
  container(
    name: string,
    options?: OperationOptions,
  ): Promise<RepositoryContainer<TProvider, TVersion>>;
}

export type AuthorizedClient<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = FluentClient<TProvider, TVersion>;

class FluentClientImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
  TAuthorization extends OAuthAuthorization | undefined = undefined,
> implements FluentClient<TProvider, TVersion> {
  readonly #selectedAdapter: SelectedGitHostAdapter<TProvider, TVersion>;
  readonly auth: Auth<TProvider, TVersion>;
  readonly native: ProviderClientNative<TProvider, TVersion>;
  readonly currentUserProfile: CurrentUserProfileCapability<TProvider, TVersion>;
  readonly packages: Packages<TProvider, TVersion>;
  readonly unsupportedOptionalCapabilities: UnsupportedOptionalCapabilities;
  readonly authorization: TAuthorization;

  constructor(
    readonly provider: TProvider,
    readonly version: TVersion,
    selectedAdapter: SelectedGitHostAdapter<TProvider, TVersion>,
    authorization: TAuthorization,
  ) {
    this.#selectedAdapter = selectedAdapter;
    this.authorization = authorization;
    this.native = createClientNativeAccess(selectedAdapter, provider);
    const capabilitySupport = getFluentClientCapabilitySupport(provider, version);
    this.currentUserProfile = createLazyCurrentUserProfileCapability(
      selectedAdapter,
      capabilitySupport.currentUserProfile,
    );
    this.packages = createLazyPackages(selectedAdapter, capabilitySupport.packages);
    this.unsupportedOptionalCapabilities = createUnsupportedOptionalCapabilities(
      capabilitySupport.unsupportedOptionalCapabilities,
    );
    this.auth = createAuth(provider, version, {
      token: (input, options) => this.#authorizeToken(input, options),
      basic: async (input, options) => {
        const adapter = await this.#selectedAdapter();
        return this.#withAdapter(await adapter.authorizeBasic(input, options), undefined);
      },
      beginOAuth: async (input) => (await this.#selectedAdapter()).beginOAuth(input),
      exchangeOAuthCode: async (input, options) =>
        await (await this.#selectedAdapter()).exchangeOAuthCode(input, options),
      oauth: (token, details, signal) => this.#authorizeOAuth(token, details, signal),
    });
    Object.freeze(this);
  }

  async containers(
    request: PageRequest = {},
  ): Promise<Page<RepositoryContainer<TProvider, TVersion>>> {
    const adapter = await this.#selectedAdapter();
    const page = await adapter.listRepositoryContainers(
      resolvePageRequest(request, 50, {
        provider: this.provider,
        version: this.version,
        operation: "listRepositoryContainers",
      }),
    );
    return createPage(
      page.items.map((data) => createRepositoryContainer(adapter, data)),
      page,
    );
  }

  async container(
    name: string,
    options: OperationOptions = {},
  ): Promise<RepositoryContainer<TProvider, TVersion>> {
    requireIdentity(name, "container name", {
      provider: this.provider,
      version: this.version,
      operation: "getRepositoryContainer",
    });
    const adapter = await this.#selectedAdapter();
    return createRepositoryContainer(
      adapter,
      await adapter.getRepositoryContainer(name, options),
    );
  }

  async #authorizeToken(
    input: TokenAuthorizationInput,
    options: OperationOptions = {},
  ): Promise<FluentClient<TProvider, TVersion>> {
    const adapter = await this.#selectedAdapter();
    return this.#withAdapter(await adapter.authorizeToken(input, options), undefined);
  }

  async #authorizeOAuth(
    token: OAuthTokenData,
    authorization: OAuthAuthorization,
    signal?: AbortSignal,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion>> {
    const adapter = await this.#selectedAdapter();
    const authorized = await adapter.authorizeToken(
      { token: token.accessToken, tokenType: token.tokenType },
      signal === undefined ? {} : { signal },
    );
    return this.#withAdapter(authorized, authorization);
  }

  #withAdapter<TDetails extends OAuthAuthorization | undefined>(
    adapter: GitHostAdapter<TProvider, TVersion>,
    authorization: TDetails,
  ): FluentClientImpl<TProvider, TVersion, TDetails> {
    return new FluentClientImpl(
      this.provider,
      this.version,
      () => Promise.resolve(adapter),
      authorization,
    );
  }
}

export function createClient<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  baseUrl: string | URL,
): FluentClient<TProvider, TVersion>;
export function createClient<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: FluentClientOptions,
): FluentClient<TProvider, TVersion>;
export function createClient(
  provider: string,
  version: string,
  baseUrlOrOptions: string | URL | FluentClientOptions,
): unknown {
  if (!isFluentProvider(provider)) throw new ProviderAdapterUnavailableError(provider, version);
  const versions: readonly string[] = fluentProviderVersions[provider];
  if (!versions.includes(version)) {
    throw new ProviderAdapterUnavailableError(provider, version);
  }
  const options = typeof baseUrlOrOptions === "string" || baseUrlOrOptions instanceof URL
    ? { baseUrl: baseUrlOrOptions }
    : baseUrlOrOptions;
  return new FluentClientImpl(
    provider,
    version as ProviderVersion<typeof provider>,
    selectGitHostAdapter(provider, version as ProviderVersion<typeof provider>, options),
    undefined,
  );
}
