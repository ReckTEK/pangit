import type { Provider, ProviderVersion } from "../providers/provider.ts";
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

class OAuthHandlerImpl<TProvider extends Provider> implements OAuthHandler<TProvider> {
  readonly #logins: OAuthLoginRegistry;

  constructor(logins: OAuthLoginRegistry) {
    this.#logins = Object.freeze({ ...logins });
  }

  start<TSelected extends TProvider>(
    provider: TSelected,
  ): Promise<OAuthLoginStart<TSelected, ProviderVersion<TSelected>>> {
    return this.#login(provider).start() as Promise<
      OAuthLoginStart<TSelected, ProviderVersion<TSelected>>
    >;
  }

  authorize(
    callback: Request,
    transaction: OAuthLoginTransactionFor<TProvider>,
  ): Promise<OAuthAuthorizedClientFor<TProvider>> {
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
      OAuthAuthorizedClientFor<TProvider>
    >;
  }

  #login(provider: Provider): RuntimeLogin {
    const login = this.#logins[provider];
    if (login === undefined) {
      throw new OAuthCallbackError(
        "provider_not_configured",
        `OAuth provider ${provider} is not configured`,
      );
    }
    return login as unknown as RuntimeLogin;
  }
}

/** Build one universal OAuth callback dispatcher over the configured provider logins. */
export function createOAuthHandler<const TLogins extends OAuthLoginRegistry>(
  logins: TLogins,
): OAuthHandler<Extract<keyof TLogins, Provider>> {
  return new OAuthHandlerImpl(logins);
}
