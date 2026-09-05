import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type {
  OAuthBeginInput,
  OAuthBeginResult,
  OAuthExchangeInput,
  OAuthTokenData,
} from "../adapter-contract/authentication.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import { ValidationError } from "../adapter-contract/errors.ts";

import type {
  Login,
  LoginOptions,
  OAuthAuthorizedClient,
  OAuthClientAuthorizer,
  OAuthLoginStart,
  OAuthLoginTransaction,
} from "./oauth-contracts.ts";
import { OAuthCallbackError } from "./OAuthCallbackError.ts";

type OAuthBegin = (input: OAuthBeginInput) => Promise<OAuthBeginResult>;
type OAuthExchange = (
  input: OAuthExchangeInput,
  options?: OperationOptions,
) => Promise<OAuthTokenData>;

class LoginImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> implements Login<TProvider, TVersion, TRegistry> {
  readonly options: LoginOptions;
  readonly #beginOAuth: OAuthBegin;
  readonly #exchangeOAuthCode: OAuthExchange;
  readonly #authorizeClient: OAuthClientAuthorizer<TProvider, TVersion, TRegistry>;

  constructor(
    readonly provider: TProvider,
    readonly version: TVersion,
    options: LoginOptions,
    beginOAuth: OAuthBegin,
    exchangeOAuthCode: OAuthExchange,
    authorizeClient: OAuthClientAuthorizer<TProvider, TVersion, TRegistry>,
  ) {
    const validationContext = { provider, version, operation: "beginOAuth" } as const;
    if (options.clientId.length === 0) {
      throw new ValidationError("clientId cannot be empty", validationContext);
    }
    const callbackUrl = new URL(options.callbackUrl);
    const callbackType = callbackUrl.searchParams.get("type");
    if (callbackType !== null && callbackType !== provider) {
      throw new ValidationError(
        `OAuth callback type ${callbackType} does not match ${provider}`,
        validationContext,
      );
    }
    callbackUrl.searchParams.set("type", provider);
    this.options = Object.freeze({
      ...options,
      callbackUrl: callbackUrl.href,
      scopes: options.scopes === undefined ? undefined : Object.freeze([...options.scopes]),
    });
    this.#beginOAuth = beginOAuth;
    this.#exchangeOAuthCode = exchangeOAuthCode;
    this.#authorizeClient = authorizeClient;
  }

  async start(): Promise<OAuthLoginStart<TProvider, TVersion, TRegistry>> {
    const state = randomBase64Url(32);
    const codeVerifier = randomBase64Url(32);
    const codeChallenge = await sha256Base64Url(codeVerifier);
    const callbackUrl = new URL(this.options.callbackUrl);
    const begin = await this.#beginOAuth({
      clientId: this.options.clientId,
      callbackUrl,
      scopes: this.options.scopes ?? [],
      state,
      codeChallenge,
      codeChallengeMethod: "S256",
    });

    return Object.freeze({
      url: begin.authorizationUrl,
      transaction: Object.freeze({
        provider: this.provider,
        version: this.version,
        state,
        codeVerifier,
        callbackUrl: callbackUrl.href,
        ...(begin.providerTransaction === undefined
          ? {}
          : { providerTransaction: begin.providerTransaction }),
      }),
    });
  }

  async authorize(
    callback: Request,
    transaction: OAuthLoginTransaction<TProvider, TVersion, TRegistry>,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion, TRegistry>> {
    validateTransaction(this, callback, transaction);
    const callbackUrl = new URL(callback.url);
    const providerError = callbackUrl.searchParams.get("error");
    if (providerError !== null) {
      throw new OAuthCallbackError(
        providerError,
        callbackUrl.searchParams.get("error_description") ?? undefined,
      );
    }
    const code = callbackUrl.searchParams.get("code");
    if (code === null || code.length === 0) {
      throw new OAuthCallbackError("missing_code", "OAuth callback did not include a code");
    }

    const token = await this.#exchangeOAuthCode({
      clientId: this.options.clientId,
      ...(this.options.clientSecret === undefined
        ? {}
        : { clientSecret: this.options.clientSecret }),
      callbackUrl: new URL(transaction.callbackUrl),
      code,
      codeVerifier: transaction.codeVerifier,
      ...(transaction.providerTransaction === undefined
        ? {}
        : { providerTransaction: transaction.providerTransaction }),
    }, { signal: callback.signal });
    const authorization = Object.freeze({
      method: "oauth" as const,
      accessToken: token.accessToken,
      tokenType: token.tokenType,
      ...(token.expiresIn === undefined ? {} : { expiresIn: token.expiresIn }),
      ...(token.refreshToken === undefined ? {} : { refreshToken: token.refreshToken }),
      ...(token.scope === undefined ? {} : { scope: token.scope }),
    });
    return await this.#authorizeClient(
      token,
      authorization,
      callback.signal,
    );
  }
}

/** @internal Build one selected provider login. */
export function createOAuthLogin<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  provider: TProvider,
  version: TVersion,
  options: LoginOptions,
  beginOAuth: OAuthBegin,
  exchangeOAuthCode: OAuthExchange,
  authorizeClient: OAuthClientAuthorizer<TProvider, TVersion, TRegistry>,
): Login<TProvider, TVersion, TRegistry> {
  return new LoginImpl(
    provider,
    version,
    options,
    beginOAuth,
    exchangeOAuthCode,
    authorizeClient,
  );
}

function validateTransaction<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  login: Login<TProvider, TVersion, TRegistry>,
  callback: Request,
  transaction: OAuthLoginTransaction<TProvider, TVersion, TRegistry>,
): void {
  if (transaction.provider !== login.provider || transaction.version !== login.version) {
    throw new OAuthCallbackError(
      "transaction_mismatch",
      "OAuth transaction does not match the selected provider client",
    );
  }
  if (transaction.callbackUrl !== new URL(login.options.callbackUrl).href) {
    throw new OAuthCallbackError(
      "callback_mismatch",
      "OAuth transaction callback does not match the configured callback",
    );
  }
  const callbackUrl = new URL(callback.url);
  const expectedUrl = new URL(transaction.callbackUrl);
  if (callbackUrl.origin !== expectedUrl.origin || callbackUrl.pathname !== expectedUrl.pathname) {
    throw new OAuthCallbackError("callback_mismatch", "OAuth callback URL is not configured");
  }
  for (const [name, value] of expectedUrl.searchParams) {
    if (callbackUrl.searchParams.get(name) !== value) {
      throw new OAuthCallbackError("callback_mismatch", "OAuth callback query is not configured");
    }
  }
  if (callbackUrl.searchParams.get("state") !== transaction.state) {
    throw new OAuthCallbackError("state_mismatch", "OAuth callback state does not match");
  }
}

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return base64Url(bytes);
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
