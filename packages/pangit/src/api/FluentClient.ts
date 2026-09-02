import type { Auth } from "./auth/authentication-contracts.ts";
import { createAuth } from "./auth/client-authentication.ts";
import type { OAuthAuthorization, OAuthAuthorizedClient } from "./auth/oauth-contracts.ts";
import type { ClientOptions } from "../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../providers/provider.ts";
import { restClientVersions } from "../providers/versions.ts";
import {
  createRepositoryContainer,
  type RepositoryContainer,
} from "./containers/RepositoryContainer.ts";
import type {
  RepositoryProviderAdapter,
  SelectedRepositoryProviderAdapter,
} from "./provider-adapters/RepositoryProviderAdapter.ts";
import { selectRepositoryProviderAdapter } from "./provider-adapters/selectRepositoryProviderAdapter.ts";

/** Fluent API client selected for one generated provider/version contract. */
export interface FluentClient<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  /** Provider selected when this client was created. */
  readonly provider: TProvider;
  /** Generated provider API version selected when this client was created. */
  readonly version: TVersion;
  /** Authentication flows that return this same fluent client surface. */
  readonly auth: Auth<TProvider, TVersion>;

  /** List repository-owning containers discoverable with the current credentials. */
  containers(): Promise<readonly RepositoryContainer<TProvider, TVersion>[]>;

  /** Resolve one named repository-owning container such as a user or organization. */
  container(name: string): Promise<RepositoryContainer<TProvider, TVersion>>;
}

/** Authorized clients retain the complete fluent client surface. */
export type AuthorizedClient<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = FluentClient<TProvider, TVersion>;

/** Concrete immutable client that delegates every domain call to one selected adapter. */
class FluentClientImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TAuthorization extends OAuthAuthorization | undefined = undefined,
> implements FluentClient<TProvider, TVersion> {
  /** Authentication flows that return this same fluent client surface. */
  readonly auth: Auth<TProvider, TVersion>;
  /** OAuth details when this client came from an OAuth callback. */
  readonly authorization: TAuthorization;
  /** Transport configuration retained for new credential-bearing clients. */
  readonly #options: ClientOptions;
  /** Memoized adapter selection shared by every operation on this client. */
  readonly #selectedProvider: SelectedRepositoryProviderAdapter<TProvider, TVersion>;

  /** Build one client around an already-selected lazy provider boundary. */
  constructor(
    readonly provider: TProvider,
    readonly version: TVersion,
    options: ClientOptions,
    selectedProvider: SelectedRepositoryProviderAdapter<TProvider, TVersion>,
    authorization: TAuthorization,
  ) {
    this.#options = options;
    this.#selectedProvider = selectedProvider;
    this.authorization = authorization;
    this.auth = createAuth(provider, version, this.#options, {
      token: (token, tokenType, signal) => this.#authorize(token, tokenType, signal),
      oauth: (token, tokenType, details, signal) =>
        this.#authorizeOAuth(token, tokenType, details, signal),
    });
    Object.freeze(this);
  }

  /** List repository-owning containers discoverable with the current credentials. */
  async containers(): Promise<readonly RepositoryContainer<TProvider, TVersion>[]> {
    const provider = await this.#selectedProvider();
    return (await provider.containers()).map((container) =>
      createRepositoryContainer(provider, container)
    );
  }

  /** Resolve one named repository-owning container such as a user or organization. */
  async container(name: string): Promise<RepositoryContainer<TProvider, TVersion>> {
    requireIdentity(name, "container name");
    const provider = await this.#selectedProvider();
    return createRepositoryContainer(provider, await provider.container(name));
  }

  /** Attach static token credentials without reducing the fluent surface. */
  async #authorize(
    token: string,
    tokenType?: string,
    signal?: AbortSignal,
  ): Promise<FluentClient<TProvider, TVersion>> {
    const provider = await this.#selectedProvider();
    const authorized = await provider.authorizeToken(token, tokenType, signal);
    return this.#withProvider(authorized, undefined);
  }

  /** Attach OAuth credentials and retain their authorization metadata. */
  async #authorizeOAuth(
    token: string,
    tokenType: string,
    authorization: OAuthAuthorization,
    signal?: AbortSignal,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion>> {
    const provider = await this.#selectedProvider();
    const authorized = await provider.authorizeToken(token, tokenType, signal);
    return this.#withProvider(authorized, authorization);
  }

  /** Create an immutable sibling client backed by one authorized adapter. */
  #withProvider<TDetails extends OAuthAuthorization | undefined>(
    provider: RepositoryProviderAdapter<TProvider, TVersion>,
    authorization: TDetails,
  ): FluentClientImpl<TProvider, TVersion, TDetails> {
    return new FluentClientImpl(
      this.provider,
      this.version,
      this.#options,
      () => Promise.resolve(provider),
      authorization,
    );
  }
}

/** Create a fluent API client for one provider and generated API version. */
export function createClient<
  const TProvider extends Provider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  baseUrl: string | URL,
): FluentClient<TProvider, TVersion>;
/** Create a fluent API client with transport options. */
export function createClient<
  const TProvider extends Provider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: ClientOptions,
): FluentClient<TProvider, TVersion>;
export function createClient<
  const TProvider extends Provider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  baseUrlOrOptions: string | URL | ClientOptions,
): FluentClient<TProvider, TVersion> {
  if (!Object.hasOwn(restClientVersions, provider)) {
    throw new TypeError(`Unknown PanGit provider ${provider}`);
  }
  const versions: readonly string[] = restClientVersions[provider];
  if (!versions.includes(version)) {
    throw new TypeError(`Unknown PanGit client ${provider} ${version}`);
  }
  const options = typeof baseUrlOrOptions === "string" || baseUrlOrOptions instanceof URL
    ? { baseUrl: baseUrlOrOptions }
    : baseUrlOrOptions;
  return new FluentClientImpl(
    provider,
    version,
    options,
    selectRepositoryProviderAdapter(provider, version, options),
    undefined,
  );
}

/** Reject an empty direct identity before loading or calling a provider. */
function requireIdentity(value: string, name: string): void {
  if (value.length === 0) throw new TypeError(`${name} cannot be empty`);
}
