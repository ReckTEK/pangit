import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";
import type { ProviderExtensions } from "../provider-extensions/ExtensionSupport.ts";

import type {
  BasicAuthorizationInput,
  BasicAuthorizationOptions,
  OAuthBeginInput,
  OAuthBeginResult,
  OAuthExchangeInput,
  OAuthTokenData,
  TokenAuthorizationInput,
} from "../adapter-contract/authentication.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import { ValidationError } from "../adapter-contract/errors.ts";

import type { FluentClient } from "../client/FluentClient.ts";
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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  /** Attach and verify token credentials. */
  token(
    input: TokenAuthorizationInput,
    options?: OperationOptions,
  ): Promise<FluentClient<TProvider, TVersion, TRegistry>>;
  /** Attach and verify Basic credentials. */
  basic(
    input: BasicAuthorizationInput,
    options?: BasicAuthorizationOptions<TProvider, TRegistry>,
  ): Promise<FluentClient<TProvider, TVersion, TRegistry>>;
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
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion, TRegistry>>;
}

class AuthImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> implements Auth<TProvider, TVersion, TRegistry> {
  readonly #provider: TProvider;
  readonly #version: TVersion;
  readonly #authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion, TRegistry>;

  constructor(
    provider: TProvider,
    version: TVersion,
    readonly extensions: ProviderExtensions<TProvider, TRegistry>,
    authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion, TRegistry>,
  ) {
    this.#provider = provider;
    this.#version = version;
    this.#authorizers = authorizers;
  }

  token(
    token: string,
    options: OperationOptions = {},
  ): Promise<FluentClient<TProvider, TVersion, TRegistry>> {
    if (token.trim().length === 0) {
      throw new ValidationError("token cannot be blank", {
        provider: this.#provider,
        version: this.#version,
        operation: "authorizeToken",
      });
    }
    return this.#authorizers.token({ token }, options);
  }

  login(options: LoginOptions): Login<TProvider, TVersion, TRegistry> {
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
    input: BasicAuthorizationInput,
  ): BasicAuthorization<TProvider, TVersion, TRegistry> {
    return createBasicAuthorization(
      this.#provider,
      this.#version,
      this.extensions["auth.basic"],
      input,
      this.#authorizers.basic,
    );
  }
}

/** @internal Build the authentication capability for one selected client. */
export function createAuth<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  provider: TProvider,
  version: TVersion,
  extensions: ProviderExtensions<TProvider, TRegistry>,
  authorizers: ClientAuthenticationAuthorizers<TProvider, TVersion, TRegistry>,
): Auth<TProvider, TVersion, TRegistry> {
  return new AuthImpl(provider, version, extensions, authorizers);
}
