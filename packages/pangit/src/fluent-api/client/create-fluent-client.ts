import type { FluentProvider, ProviderVersion } from "../adapter-contract/provider.ts";
import type {
  OAuthTokenData,
  TokenAuthorizationInput,
} from "../adapter-contract/authentication.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import { type OperationOptions, requireIdentity } from "../adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../adapter-contract/pagination.ts";

import type { Auth } from "../auth/authentication-contracts.ts";
import { createAuth } from "../auth/client-authentication.ts";
import type { OAuthAuthorization, OAuthAuthorizedClient } from "../auth/oauth-contracts.ts";
import {
  createCurrentUserProfileCapability,
  type CurrentUserProfileCapability,
} from "../capabilities/optional/CurrentUserProfile.ts";
import { createPackages, type Packages } from "../capabilities/optional/Packages.ts";
import {
  createUnsupportedOptionalCapabilities,
  type UnsupportedOptionalCapabilities,
} from "../capabilities/optional/UnsupportedOptionalCapabilities.ts";
import {
  createRepositoryContainer,
  type RepositoryContainer,
} from "../entities/RepositoryContainer.ts";

import type { ProviderClientNative } from "../native-access/ProviderNativeRegistry.ts";

import type { FluentClient } from "./FluentClient.ts";
class FluentClientImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
  TAuthorization extends OAuthAuthorization | undefined = undefined,
> implements FluentClient<TProvider, TVersion> {
  readonly #adapter: GitHostAdapter<TProvider, TVersion>;
  readonly auth: Auth<TProvider, TVersion>;
  readonly native: ProviderClientNative<TProvider, TVersion>;
  readonly currentUserProfile: CurrentUserProfileCapability<TProvider, TVersion>;
  readonly packages: Packages<TProvider, TVersion>;
  readonly unsupportedOptionalCapabilities: UnsupportedOptionalCapabilities;
  readonly authorization: TAuthorization;

  constructor(
    readonly provider: TProvider,
    readonly version: TVersion,
    adapter: GitHostAdapter<TProvider, TVersion>,
    authorization: TAuthorization,
  ) {
    this.#adapter = adapter;
    this.authorization = authorization;
    this.native = adapter.native;
    this.currentUserProfile = createCurrentUserProfileCapability(
      adapter,
    );
    this.packages = createPackages(adapter);
    this.unsupportedOptionalCapabilities = createUnsupportedOptionalCapabilities(
      adapter.unsupportedOptionalCapabilities,
    );
    this.auth = createAuth(provider, version, adapter.extensions, {
      token: (input, options) => this.#authorizeToken(input, options),
      basic: async (input, options) => {
        const adapter = this.#adapter;
        return this.#withAdapter(await adapter.authorizeBasic(input, options), undefined);
      },
      beginOAuth: (input) => Promise.resolve(this.#adapter.beginOAuth(input)),
      exchangeOAuthCode: async (input, options) =>
        await this.#adapter.exchangeOAuthCode(input, options),
      oauth: (token, details, signal) => this.#authorizeOAuth(token, details, signal),
    });
    Object.freeze(this);
  }

  async containers(
    request: PageRequest = {},
  ): Promise<Page<RepositoryContainer<TProvider, TVersion>>> {
    const adapter = this.#adapter;
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
    const adapter = this.#adapter;
    return createRepositoryContainer(
      adapter,
      await adapter.getRepositoryContainer(name, options),
    );
  }

  async #authorizeToken(
    input: TokenAuthorizationInput,
    options: OperationOptions = {},
  ): Promise<FluentClient<TProvider, TVersion>> {
    const adapter = this.#adapter;
    return this.#withAdapter(await adapter.authorizeToken(input, options), undefined);
  }

  async #authorizeOAuth(
    token: OAuthTokenData,
    authorization: OAuthAuthorization,
    signal?: AbortSignal,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion>> {
    const adapter = this.#adapter;
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
      adapter,
      authorization,
    );
  }
}

/** Construct provider-neutral behavior around an already selected implementation. */
export function createFluentClient<P extends FluentProvider, V extends ProviderVersion<P>>(
  adapter: GitHostAdapter<P, V>,
): FluentClient<P, V> {
  return new FluentClientImpl(adapter.provider, adapter.version, adapter, undefined);
}
