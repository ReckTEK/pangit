import type { ClientOptions } from "../../generated-rest-clients/client-options.ts";
import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { FluentClient } from "../FluentClient.ts";
import type { Auth, BasicAuthorization } from "./authentication-contracts.ts";
import { createBasicAuthorization } from "./basic-authorization.ts";
import type {
  Login,
  LoginOptions,
  OAuthAuthorization,
  OAuthAuthorizedClient,
} from "./oauth-contracts.ts";
import { createOAuthLogin } from "./oauth-login.ts";

/** Client constructors used by authentication flows after credentials are acquired. */
export interface ClientAuthenticationAuthorizers<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  /** Attach and verify token credentials. */
  token(
    token: string,
    tokenType?: string,
    signal?: AbortSignal,
  ): Promise<FluentClient<TProvider, TVersion>>;
  /** Attach and verify OAuth credentials while retaining their token metadata. */
  oauth(
    token: string,
    tokenType: string,
    authorization: OAuthAuthorization,
    signal?: AbortSignal,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion>>;
}

class AuthImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements Auth<TProvider, TVersion> {
  readonly #provider: TProvider;
  readonly #version: TVersion;
  readonly #options: ClientOptions;
  readonly #authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion>;

  constructor(
    provider: TProvider,
    version: TVersion,
    options: ClientOptions,
    authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion>,
  ) {
    this.#provider = provider;
    this.#version = version;
    this.#options = options;
    this.#authorizers = authorizers;
  }

  token(token: string): Promise<FluentClient<TProvider, TVersion>> {
    if (token.length === 0) throw new TypeError("token cannot be empty");
    return this.#authorizers.token(token);
  }

  login(options: LoginOptions): Login<TProvider, TVersion> {
    return createOAuthLogin(
      this.#provider,
      this.#version,
      options,
      this.#options,
      this.#authorizers.oauth,
    );
  }

  basic(): BasicAuthorization<TProvider, TVersion> {
    return createBasicAuthorization(this.#provider, this.#version);
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
  authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion>,
): Auth<TProvider, TVersion> {
  return new AuthImpl(provider, version, options, authorizers);
}
