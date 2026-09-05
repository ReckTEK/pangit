import { supplementalOperation } from "./supplemental.ts";
import { unavailable } from "./shared.ts";
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
import type { GitLabUserPayload } from "./supplemental.ts";
import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import {
  type GitLabOperation,
  normalizeGitLabThrown,
  requestGitLabBody,
  throwForGitLabHttpResponse,
} from "./response.ts";

type AnyGitLabUser = GitLabUserPayload;

/** Attach and verify a GitLab PAT or OAuth access token in one identity request. */
export async function authorizeGitLabToken<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  input: TokenAuthorizationInput,
  options: OperationOptions = {},
): Promise<GitLabAdapterContext<TVersion>> {
  const operation = { universal: "authorizeToken", native: "gitlab-supplement:GET:/user" } as const;
  requireSecret(context, operation, input.token, "token");
  const tokenType = input.tokenType ?? "Bearer";
  if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(tokenType)) {
    throw validationError(context, operation, "tokenType must be a valid authorization scheme");
  }
  return await verifyGitLabCredentials(
    context.withHeaders({ Authorization: `${tokenType} ${input.token}` }),
    operation,
    options,
  );
}

/** GitLab REST accepts token/OAuth credentials, so reject Basic locally. */
export async function authorizeGitLabBasic<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  input: BasicAuthorizationInput,
  options: OperationOptions = {},
): Promise<GitLabAdapterContext<TVersion>> {
  await Promise.resolve();
  void input;
  void options;
  return unavailable(
    context,
    "authorizeBasic",
    "GitLab REST does not accept HTTP Basic authentication; use a personal access token or OAuth",
  );
}

/** Build the provider-hosted GitLab authorization URL without issuing a request. */
export function beginGitLabOAuth<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  input: OAuthBeginInput,
): OAuthBeginResult {
  const authorizationUrl = new URL("oauth/authorize", context.webBaseUrl());
  authorizationUrl.searchParams.set("client_id", input.clientId);
  authorizationUrl.searchParams.set("redirect_uri", input.callbackUrl.href);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("state", input.state);
  authorizationUrl.searchParams.set("code_challenge_method", input.codeChallengeMethod);
  authorizationUrl.searchParams.set("code_challenge", input.codeChallenge);
  if (input.scopes.length > 0) authorizationUrl.searchParams.set("scope", input.scopes.join(" "));
  return Object.freeze({ authorizationUrl });
}

/** Exchange one GitLab OAuth authorization code through a query/header-sanitized transport. */
export async function exchangeGitLabOAuthCode<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  input: OAuthExchangeInput,
  options: OperationOptions = {},
): Promise<OAuthTokenData> {
  const operation = { universal: "exchangeOAuthCode", native: "oauthAccessToken" } as const;
  const tokenUrl = new URL("oauth/token", context.webBaseUrl());
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
    throwForGitLabHttpResponse(context, operation, response);
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
    throw normalizeGitLabThrown(context, operation, cause, options.signal);
  }
}

async function verifyGitLabCredentials<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  options: OperationOptions,
): Promise<GitLabAdapterContext<TVersion>> {
  const client = await context.client();
  const currentUser = await requestGitLabBody<AnyGitLabUser, TVersion>(
    context,
    operation,
    () => client.rest.request(supplementalOperation("GET", "/user"), {}, requestOptions(options)),
    options.signal,
    isGitLabUser,
  );
  return await context.withCurrentUser(currentUser as GitLabUserPayload);
}

function requestOptions(options: OperationOptions): { readonly signal?: AbortSignal } {
  return options.signal === undefined ? {} : { signal: options.signal };
}

function requireSecret<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  value: string,
  name: string,
): void {
  if (value.length === 0 || value.trim().length === 0) {
    throw validationError(context, operation, `${name} cannot be blank`);
  }
}

function validationError<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitlab",
    version: context.version,
    operation: operation.universal,
  });
}

function isGitLabUser(value: unknown): value is AnyGitLabUser {
  return isRecord(value) && typeof value.username === "string" && value.username.trim().length > 0;
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

function requiredTokenString<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: string,
  value: unknown,
  name: string,
): string {
  const parsed = optionalString(value);
  if (parsed !== undefined && parsed.length > 0) return parsed;
  throw new ProviderInvariantError(`OAuth token response has no ${name}`, {
    provider: "gitlab",
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
