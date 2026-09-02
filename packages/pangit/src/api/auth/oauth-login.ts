import type { ClientOptions } from "../../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../../providers/provider.ts";
import type {
  Login,
  LoginOptions,
  OAuthAuthorizedClient,
  OAuthClientAuthorizer,
  OAuthLoginStart,
  OAuthLoginTransaction,
} from "./oauth-contracts.ts";
import { AuthAdapterNotImplementedError } from "./AuthAdapterNotImplementedError.ts";
import { OAuthCallbackError } from "./OAuthCallbackError.ts";

type TokenResponse = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  scope?: unknown;
  error?: unknown;
  error_description?: unknown;
};

class LoginImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements Login<TProvider, TVersion> {
  readonly options: LoginOptions;
  readonly #clientOptions: ClientOptions;
  readonly #authorizeClient: OAuthClientAuthorizer<TProvider, TVersion>;

  constructor(
    readonly provider: TProvider,
    readonly version: TVersion,
    options: LoginOptions,
    clientOptions: ClientOptions,
    authorizeClient: OAuthClientAuthorizer<TProvider, TVersion>,
  ) {
    if (options.clientId.length === 0) throw new TypeError("clientId cannot be empty");
    const callbackUrl = new URL(options.callbackUrl);
    const callbackType = callbackUrl.searchParams.get("type");
    if (callbackType !== null && callbackType !== provider) {
      throw new TypeError(`OAuth callback type ${callbackType} does not match ${provider}`);
    }
    callbackUrl.searchParams.set("type", provider);
    this.options = Object.freeze({
      ...options,
      callbackUrl,
      scopes: options.scopes === undefined ? undefined : Object.freeze([...options.scopes]),
    });
    this.#clientOptions = clientOptions;
    this.#authorizeClient = authorizeClient;
  }

  async start(): Promise<OAuthLoginStart<TProvider, TVersion>> {
    this.#requireGitea();
    const state = randomBase64Url(32);
    const codeVerifier = randomBase64Url(32);
    const codeChallenge = await sha256Base64Url(codeVerifier);
    const callbackUrl = new URL(this.options.callbackUrl);
    const url = new URL("login/oauth/authorize", providerRoot(this.#clientOptions.baseUrl));
    url.searchParams.set("client_id", this.options.clientId);
    url.searchParams.set("redirect_uri", callbackUrl.href);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("code_challenge", codeChallenge);
    if (this.options.scopes !== undefined && this.options.scopes.length > 0) {
      url.searchParams.set("scope", this.options.scopes.join(" "));
    }

    return Object.freeze({
      url,
      transaction: Object.freeze({
        provider: this.provider,
        version: this.version,
        state,
        codeVerifier,
        callbackUrl: callbackUrl.href,
      }),
    });
  }

  async authorize(
    callback: Request,
    transaction: OAuthLoginTransaction<TProvider, TVersion>,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion>> {
    this.#requireGitea();
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

    const tokenUrl = new URL("login/oauth/access_token", providerRoot(this.#clientOptions.baseUrl));
    const body = new URLSearchParams({
      client_id: this.options.clientId,
      code,
      grant_type: "authorization_code",
      redirect_uri: transaction.callbackUrl,
      code_verifier: transaction.codeVerifier,
    });
    const { RestClient } = await import("../../providers/runtime/mod.ts");
    const transport = new RestClient(this.#clientOptions);
    const response = await transport.fetch(tokenUrl, {
      method: "POST",
      signal: callback.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = await readTokenResponse(response);
    if (!response.ok) {
      const errorCode = stringValue(payload.error) ?? `http_${response.status}`;
      throw new OAuthCallbackError(errorCode, stringValue(payload.error_description));
    }
    const accessToken = requiredString(payload.access_token, "access_token");
    const tokenType = requiredString(payload.token_type, "token_type");

    const expiresIn = numberValue(payload.expires_in);
    const refreshToken = stringValue(payload.refresh_token);
    const scope = stringValue(payload.scope);
    const authorization = Object.freeze({
      method: "oauth" as const,
      accessToken,
      tokenType,
      ...(expiresIn === undefined ? {} : { expiresIn }),
      ...(refreshToken === undefined ? {} : { refreshToken }),
      ...(scope === undefined ? {} : { scope }),
    });
    return await this.#authorizeClient(
      accessToken,
      tokenType,
      authorization,
      callback.signal,
    );
  }

  #requireGitea(): void {
    if (this.provider !== "gitea") {
      throw new AuthAdapterNotImplementedError("OAuth login");
    }
  }
}

/** @internal Build one selected provider login. */
export function createOAuthLogin<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: LoginOptions,
  clientOptions: ClientOptions,
  authorizeClient: OAuthClientAuthorizer<TProvider, TVersion>,
): Login<TProvider, TVersion> {
  return new LoginImpl(provider, version, options, clientOptions, authorizeClient);
}

function validateTransaction<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(
  login: Login<TProvider, TVersion>,
  callback: Request,
  transaction: OAuthLoginTransaction<TProvider, TVersion>,
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

function providerRoot(baseUrl: string | URL): URL {
  const root = new URL(baseUrl);
  root.search = "";
  root.hash = "";
  root.pathname = root.pathname.replace(/\/?api\/v1\/?$/, "/");
  if (!root.pathname.endsWith("/")) root.pathname += "/";
  return root;
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

async function readTokenResponse(response: Response): Promise<TokenResponse> {
  const text = await response.text();
  if (text.length === 0) return {};
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    return value as TokenResponse;
  } catch {
    return Object.fromEntries(new URLSearchParams(text)) as TokenResponse;
  }
}

function requiredString(value: unknown, name: string): string {
  const parsed = stringValue(value);
  if (parsed === undefined || parsed.length === 0) {
    throw new OAuthCallbackError("invalid_token_response", `OAuth token response has no ${name}`);
  }
  return parsed;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
