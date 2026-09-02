import type {
  BasicAuthorizationInput,
  OAuthBeginInput,
  OAuthBeginResult,
  OAuthExchangeInput,
  OAuthTokenData,
  TokenAuthorizationInput,
} from "../../fluent-api/adapter-contract/authentication.ts";
import {
  ProviderInvariantError,
  ValidationError,
} from "../../fluent-api/adapter-contract/errors.ts";
import type { OperationOptions } from "../../fluent-api/adapter-contract/operation-options.ts";
import type { GiteaUserPayload } from "./native/GiteaRepositoryContainerNative.ts";
import type { GiteaAdapterContext } from "./GiteaAdapterContext.ts";
import type { GiteaVersion } from "./native/GiteaEntityNative.ts";
import {
  type GiteaOperation,
  normalizeGiteaThrown,
  requestGiteaBody,
  throwForGiteaHttpResponse,
} from "./response.ts";

type AnyGiteaUser = GiteaUserPayload<GiteaVersion>;

/** Attach and verify a Gitea PAT or OAuth access token in one identity request. */
export async function authorizeGiteaToken<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  input: TokenAuthorizationInput,
  options: OperationOptions = {},
): Promise<GiteaAdapterContext<TVersion>> {
  const operation = { universal: "authorizeToken", native: "userGetCurrent" } as const;
  requireSecret(context, operation, input.token, "token");
  const tokenType = input.tokenType ?? "token";
  if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(tokenType)) {
    throw validationError(context, operation, "tokenType must be a valid authorization scheme");
  }
  return await verifyGiteaCredentials(
    context.withHeaders({ Authorization: `${tokenType} ${input.token}` }),
    operation,
    options,
  );
}

/** Attach RFC Basic credentials and an optional Gitea one-time-password header. */
export async function authorizeGiteaBasic<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  input: BasicAuthorizationInput,
  options: OperationOptions = {},
): Promise<GiteaAdapterContext<TVersion>> {
  const operation = { universal: "authorizeBasic", native: "userGetCurrent" } as const;
  if (input.username.trim().length === 0) {
    throw validationError(context, operation, "username cannot be blank");
  }
  if (input.username.includes(":")) {
    throw validationError(context, operation, "username cannot contain ':'");
  }
  requireSecret(context, operation, input.password, "password");
  if (input.oneTimePassword !== undefined && input.oneTimePassword.trim().length === 0) {
    throw validationError(context, operation, "oneTimePassword cannot be blank");
  }
  const headers = new Headers({
    Authorization: `Basic ${utf8Base64(`${input.username}:${input.password}`)}`,
  });
  if (input.oneTimePassword !== undefined) {
    headers.set("X-GITEA-OTP", input.oneTimePassword);
  }
  return await verifyGiteaCredentials(
    context.withHeaders(headers),
    operation,
    options,
  );
}

/** Build the provider-hosted Gitea authorization URL without issuing a request. */
export function beginGiteaOAuth<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  input: OAuthBeginInput,
): OAuthBeginResult {
  const authorizationUrl = new URL("login/oauth/authorize", context.webBaseUrl());
  authorizationUrl.searchParams.set("client_id", input.clientId);
  authorizationUrl.searchParams.set("redirect_uri", input.callbackUrl.href);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("state", input.state);
  authorizationUrl.searchParams.set("code_challenge_method", input.codeChallengeMethod);
  authorizationUrl.searchParams.set("code_challenge", input.codeChallenge);
  if (input.scopes.length > 0) authorizationUrl.searchParams.set("scope", input.scopes.join(" "));
  return Object.freeze({ authorizationUrl });
}

/** Exchange one Gitea OAuth authorization code through a query/header-sanitized transport. */
export async function exchangeGiteaOAuthCode<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  input: OAuthExchangeInput,
  options: OperationOptions = {},
): Promise<OAuthTokenData> {
  const operation = { universal: "exchangeOAuthCode", native: "oauthAccessToken" } as const;
  const tokenUrl = new URL("login/oauth/access_token", context.webBaseUrl());
  const body = new URLSearchParams({
    client_id: input.clientId,
    code: input.code,
    grant_type: "authorization_code",
    redirect_uri: input.callbackUrl.href,
    code_verifier: input.codeVerifier,
  });
  if (input.clientSecret !== undefined) body.set("client_secret", input.clientSecret);

  try {
    const response = await context.oauthTransport().fetch(tokenUrl, {
      method: "POST",
      signal: options.signal,
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = await readTokenPayload(response);
    throwForGiteaHttpResponse(context, operation, response);
    const accessToken = requiredTokenString(
      context,
      operation.universal,
      payload.access_token,
      "access_token",
    );
    const tokenType = requiredTokenString(
      context,
      operation.universal,
      payload.token_type,
      "token_type",
    );
    const expiresIn = optionalNumber(payload.expires_in);
    const refreshToken = optionalString(payload.refresh_token);
    const scope = optionalString(payload.scope);
    return Object.freeze({
      accessToken,
      tokenType,
      ...(expiresIn === undefined ? {} : { expiresIn }),
      ...(refreshToken === undefined ? {} : { refreshToken }),
      ...(scope === undefined ? {} : { scope }),
    });
  } catch (cause) {
    throw normalizeGiteaThrown(context, operation, cause, options.signal);
  }
}

async function verifyGiteaCredentials<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  options: OperationOptions,
): Promise<GiteaAdapterContext<TVersion>> {
  const client = await context.client();
  const currentUser = await requestGiteaBody<AnyGiteaUser, TVersion>(
    context,
    operation,
    () => client.userGetCurrent({}, requestOptions(options)),
    options.signal,
    isGiteaUser,
  );
  return await context.withCurrentUser(currentUser as GiteaUserPayload<TVersion>);
}

function requestOptions(options: OperationOptions): { readonly signal?: AbortSignal } {
  return options.signal === undefined ? {} : { signal: options.signal };
}

function requireSecret<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  value: string,
  name: string,
): void {
  if (value.length === 0 || value.trim().length === 0) {
    throw validationError(context, operation, `${name} cannot be blank`);
  }
}

function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
  });
}

function utf8Base64(value: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function isGiteaUser(value: unknown): value is AnyGiteaUser {
  return isRecord(value) && typeof value.login === "string" && value.login.trim().length > 0;
}

type TokenPayload = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  scope?: unknown;
};

async function readTokenPayload(response: Response): Promise<TokenPayload> {
  const text = await response.text();
  if (text.length === 0) return {};
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

function requiredTokenString<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
  name: string,
): string {
  const parsed = optionalString(value);
  if (parsed !== undefined && parsed.length > 0) return parsed;
  throw new ProviderInvariantError(`OAuth token response has no ${name}`, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.length === 0) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
