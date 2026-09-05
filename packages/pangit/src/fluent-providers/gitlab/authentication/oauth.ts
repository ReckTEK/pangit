import type {
  OAuthBeginInput,
  OAuthBeginResult,
  OAuthExchangeInput,
  OAuthTokenData,
} from "../../../fluent-api/adapter-contract/authentication.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import { normalizeGitLabThrown, throwForGitLabHttpResponse } from "../transport/response/mod.ts";
import {
  optionalNumber,
  optionalString,
  readTokenPayload,
  requiredTokenString,
} from "./token-payload.ts";

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
