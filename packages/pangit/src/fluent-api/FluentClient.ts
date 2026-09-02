import type { Auth } from "./auth/authentication-contracts.ts";
import { createAuth } from "./auth/client-authentication.ts";
import type { OAuthAuthorization, OAuthAuthorizedClient } from "./auth/oauth-contracts.ts";
import type { ClientOptions } from "../generated-rest-clients/client-options.ts";
import type { Provider, ProviderVersion } from "../generated-rest-clients/git-host.ts";
import { restClientVersions } from "../generated-rest-clients/supported-versions.ts";
import {
  createRepositoryContainer,
  type RepositoryContainer,
} from "./containers/RepositoryContainer.ts";
import type {
  RepositoryHostAdapter,
  SelectedRepositoryHostAdapter,
} from "./host-adapter-contract/RepositoryHostAdapter.ts";
import { selectRepositoryHostAdapter } from "./select-repository-host-adapter.ts";

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
  readonly #selectedAdapter: SelectedRepositoryHostAdapter<TProvider, TVersion>;

  /** Build one client around an already-selected lazy provider boundary. */
  constructor(
    readonly provider: TProvider,
    readonly version: TVersion,
    options: ClientOptions,
    selectedAdapter: SelectedRepositoryHostAdapter<TProvider, TVersion>,
    authorization: TAuthorization,
  ) {
    this.#options = options;
    this.#selectedAdapter = selectedAdapter;
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
    const adapter = await this.#selectedAdapter();
    return (await adapter.containers()).map((container) =>
      createRepositoryContainer(adapter, container)
    );
  }

  /** Resolve one named repository-owning container such as a user or organization. */
  async container(name: string): Promise<RepositoryContainer<TProvider, TVersion>> {
    requireIdentity(name, "container name");
    const adapter = await this.#selectedAdapter();
    return createRepositoryContainer(adapter, await adapter.container(name));
  }

  /** Attach static token credentials without reducing the fluent surface. */
  async #authorize(
    token: string,
    tokenType?: string,
    signal?: AbortSignal,
  ): Promise<FluentClient<TProvider, TVersion>> {
    const adapter = await this.#selectedAdapter();
    const authorized = await adapter.authorizeToken(token, tokenType, signal);
    return this.#withAdapter(authorized, undefined);
  }

  /** Attach OAuth credentials and retain their authorization metadata. */
  async #authorizeOAuth(
    token: string,
    tokenType: string,
    authorization: OAuthAuthorization,
    signal?: AbortSignal,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion>> {
    const adapter = await this.#selectedAdapter();
    const authorized = await adapter.authorizeToken(token, tokenType, signal);
    return this.#withAdapter(authorized, authorization);
  }

  /** Create an immutable sibling client backed by one authorized adapter. */
  #withAdapter<TDetails extends OAuthAuthorization | undefined>(
    adapter: RepositoryHostAdapter<TProvider, TVersion>,
    authorization: TDetails,
  ): FluentClientImpl<TProvider, TVersion, TDetails> {
    return new FluentClientImpl(
      this.provider,
      this.version,
      this.#options,
      () => Promise.resolve(adapter),
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
    selectRepositoryHostAdapter(provider, version, options),
    undefined,
  );
}

/** Reject an empty direct identity before loading or calling a provider. */
function requireIdentity(value: string, name: string): void {
  if (value.length === 0) throw new TypeError(`${name} cannot be empty`);
}
