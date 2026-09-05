import type {
  OAuthBeginInput,
  OAuthBeginResult,
  OAuthExchangeInput,
  OAuthTokenData,
} from "../../../fluent-api/adapter-contract/authentication.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { normalizeForgejoThrown, throwForForgejoHttpResponse } from "../transport/response/mod.ts";
import {
  optionalNumber,
  optionalString,
  readTokenPayload,
  requiredTokenString,
} from "./token-payload.ts";

/** Build the provider-hosted Forgejo authorization URL without issuing a request. */
export function beginForgejoOAuth<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
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

/** Exchange one Forgejo OAuth authorization code through a query/header-sanitized transport. */
export async function exchangeForgejoOAuthCode<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
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
    throwForForgejoHttpResponse(context, operation, response);
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
    throw normalizeForgejoThrown(context, operation, cause, options.signal);
  }
}
