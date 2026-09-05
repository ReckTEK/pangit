import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type {
  BasicAuthorizationInput,
  OAuthBeginInput,
  OAuthBeginResult,
  OAuthExchangeInput,
  OAuthTokenData,
  TokenAuthorizationInput,
} from "../adapter-contract/authentication.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import { ValidationError } from "../adapter-contract/errors.ts";
import type { FluentProvider } from "../provider-registry.ts";
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
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  /** Attach and verify token credentials. */
  token(
    input: TokenAuthorizationInput,
    options?: OperationOptions,
  ): Promise<FluentClient<TProvider, TVersion>>;
  /** Attach and verify Basic credentials. */
  basic(
    input: BasicAuthorizationInput,
    options?: OperationOptions,
  ): Promise<FluentClient<TProvider, TVersion>>;
  /** Ask the selected adapter for its provider-hosted OAuth URL. */
  beginOAuth(input: OAuthBeginInput): Promise<OAuthBeginResult>;
  /** Exchange the callback code using selected-provider transport semantics. */
  exchangeOAuthCode(
    input: OAuthExchangeInput,
    options?: OperationOptions,
  ): Promise<OAuthTokenData>;
  /** Attach and verify OAuth credentials while retaining their token metadata. */
  oauth(
    token: OAuthTokenData,
    authorization: OAuthAuthorization,
    signal?: AbortSignal,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion>>;
}

class AuthImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> implements Auth<TProvider, TVersion> {
  readonly #provider: TProvider;
  readonly #version: TVersion;
  readonly #authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion>;

  constructor(
    provider: TProvider,
    version: TVersion,
    authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion>,
  ) {
    this.#provider = provider;
    this.#version = version;
    this.#authorizers = authorizers;
  }

  token(token: string, options: OperationOptions = {}): Promise<FluentClient<TProvider, TVersion>> {
    if (token.trim().length === 0) {
      throw new ValidationError("token cannot be blank", {
        provider: this.#provider,
        version: this.#version,
        operation: "authorizeToken",
      });
    }
    return this.#authorizers.token({ token }, options);
  }

  login(options: LoginOptions): Login<TProvider, TVersion> {
    return createOAuthLogin(
      this.#provider,
      this.#version,
      options,
      this.#authorizers.beginOAuth,
      this.#authorizers.exchangeOAuthCode,
      this.#authorizers.oauth,
    );
  }

  basic(
    input: Omit<BasicAuthorizationInput, "oneTimePassword">,
  ): BasicAuthorization<TProvider, TVersion> {
    return createBasicAuthorization(this.#provider, input, this.#authorizers.basic);
  }
}

/** @internal Build the authentication capability for one selected client. */
export function createAuth<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion>,
): Auth<TProvider, TVersion> {
  return new AuthImpl(provider, version, authorizers);
}
