import type { AuthorizedClient, ClientOptions } from "../client/core.ts";
import { loadRestClient, type Provider, type ProviderVersion } from "../generated/mod.ts";
import type {
  Auth,
  AuthBranch,
  BasicAuthorization,
  Login,
  LoginOptions,
  TokenAuthorization,
} from "./core.ts";

export type {
  Auth,
  AuthBranch,
  BasicAuthorization,
  Login,
  LoginOptions,
  TokenAuthorization,
} from "./core.ts";

/** The fluent auth surface exists; provider protocol adapters are the next implementation slice. */
export class AuthAdapterNotImplementedError extends Error {
  constructor(path: string) {
    super(`${path} provider adapter is not implemented yet`);
    this.name = "AuthAdapterNotImplementedError";
  }
}

class LoginImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements Login<TProvider, TVersion> {
  readonly options: LoginOptions;

  constructor(
    readonly provider: TProvider,
    readonly version: TVersion,
    options: LoginOptions,
  ) {
    this.options = Object.freeze({
      ...options,
      callbackUrl: new URL(options.callbackUrl),
      scopes: options.scopes === undefined ? undefined : Object.freeze([...options.scopes]),
    });
  }

  start(): Promise<URL> {
    return Promise.reject(new AuthAdapterNotImplementedError("OAuth login"));
  }

  authorize(_callback: Request): Promise<AuthorizedClient<TProvider, TVersion>> {
    return Promise.reject(new AuthAdapterNotImplementedError("OAuth login"));
  }
}

class BasicAuthorizationImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements BasicAuthorization<TProvider, TVersion> {
  readonly #provider: TProvider;
  readonly #version: TVersion;
  #gitea?: AuthBranch;
  #codeberg?: AuthBranch;
  #bitbucket?: AuthBranch;

  constructor(
    provider: TProvider,
    version: TVersion,
  ) {
    this.#provider = provider;
    this.#version = version;
  }

  gitea(branch: AuthBranch): this {
    this.#gitea = branch;
    return this;
  }

  codeberg(branch: AuthBranch): this {
    this.#codeberg = branch;
    return this;
  }

  bitbucket(branch: AuthBranch): this {
    this.#bitbucket = branch;
    return this;
  }

  authorize(): Promise<AuthorizedClient<TProvider, TVersion>> {
    let branch: AuthBranch | undefined;
    switch (this.#provider) {
      case "gitea":
        branch = this.#gitea;
        break;
      case "codeberg":
        branch = this.#codeberg;
        break;
      case "bitbucket":
        branch = this.#bitbucket;
        break;
      default:
        return Promise.reject(
          new Error(`${this.#provider} does not support Basic authentication`),
        );
    }
    if (branch === undefined) {
      return Promise.reject(
        new Error(`No Basic authentication branch was declared for ${this.#provider}`),
      );
    }
    void branch;
    return Promise.reject(new AuthAdapterNotImplementedError("Basic authentication"));
  }
}

class AuthImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements Auth<TProvider, TVersion> {
  readonly #provider: TProvider;
  readonly #version: TVersion;
  readonly #options: ClientOptions;

  constructor(
    provider: TProvider,
    version: TVersion,
    options: ClientOptions,
  ) {
    this.#provider = provider;
    this.#version = version;
    this.#options = options;
  }

  async token(input: TokenAuthorization): Promise<AuthorizedClient<TProvider, TVersion>> {
    if (input.token.length === 0) throw new TypeError("token cannot be empty");
    if (this.#provider !== "gitea") {
      throw new AuthAdapterNotImplementedError("Token authentication");
    }

    const client = await loadRestClient(
      "gitea",
      this.#version as ProviderVersion<"gitea">,
      {
        ...this.#options,
        headers: { Authorization: `token ${input.token}` },
        throwOnError: false,
      },
    );
    const response = await client.userGetCurrent();
    if (!response.ok || response.status !== 200 || !response.documented) {
      throw new Error(
        `Gitea token authorization failed: GET /user returned HTTP ${response.status}`,
      );
    }

    return Object.freeze({
      provider: this.#provider,
      version: this.#version,
    });
  }

  login(options: LoginOptions): Login<TProvider, TVersion> {
    return new LoginImpl(this.#provider, this.#version, options);
  }

  basic(): BasicAuthorization<TProvider, TVersion> {
    return new BasicAuthorizationImpl(this.#provider, this.#version);
  }
}

/** @internal Build the authentication capability for one selected client. */
export function createAuth<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: ClientOptions,
): Auth<TProvider, TVersion> {
  return new AuthImpl(provider, version, options);
}
