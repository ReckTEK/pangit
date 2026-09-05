import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type {
  OAuthAuthorizedClientFor,
  OAuthHandler,
  OAuthLoginRegistry,
  OAuthLoginStart,
  OAuthLoginTransactionFor,
} from "./oauth-contracts.ts";
import { OAuthCallbackError } from "./OAuthCallbackError.ts";

type RuntimeLogin = {
  start(): Promise<unknown>;
  authorize(callback: Request, transaction: unknown): Promise<unknown>;
};

class OAuthHandlerImpl<
  TProvider extends FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> implements OAuthHandler<TProvider, TRegistry> {
  readonly #logins: OAuthLoginRegistry<TRegistry>;

  constructor(logins: OAuthLoginRegistry<TRegistry>) {
    this.#logins = Object.freeze({ ...logins });
  }

  start<TSelected extends TProvider>(
    provider: TSelected,
  ): Promise<OAuthLoginStart<TSelected, ProviderVersion<TSelected, TRegistry>, TRegistry>> {
    return this.#login(provider).start() as Promise<
      OAuthLoginStart<TSelected, ProviderVersion<TSelected, TRegistry>, TRegistry>
    >;
  }

  authorize(
    callback: Request,
    transaction: OAuthLoginTransactionFor<TProvider, TRegistry>,
  ): Promise<OAuthAuthorizedClientFor<TProvider, TRegistry>> {
    const callbackType = new URL(callback.url).searchParams.get("type");
    if (callbackType === null) {
      return Promise.reject(new OAuthCallbackError("missing_type", "OAuth callback has no type"));
    }
    if (callbackType !== transaction.provider) {
      return Promise.reject(
        new OAuthCallbackError(
          "provider_mismatch",
          `OAuth callback type ${callbackType} does not match ${transaction.provider}`,
        ),
      );
    }
    return this.#login(transaction.provider).authorize(callback, transaction) as Promise<
      OAuthAuthorizedClientFor<TProvider, TRegistry>
    >;
  }

  #login(provider: FluentProvider): RuntimeLogin {
    const login = Object.hasOwn(this.#logins, provider) ? this.#logins[provider] : undefined;
    if (login === undefined) {
      throw new OAuthCallbackError(
        "provider_not_configured",
        `OAuth provider ${provider} is not configured`,
      );
    }
    return login as unknown as RuntimeLogin;
  }
}

/** Build one OAuth callback dispatcher over the configured provider logins. */
export function createOAuthHandler<
  const TLogins extends OAuthLoginRegistry<TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  logins: TLogins,
): OAuthHandler<Extract<keyof TLogins, FluentProvider>, TRegistry> {
  return new OAuthHandlerImpl(logins);
}
