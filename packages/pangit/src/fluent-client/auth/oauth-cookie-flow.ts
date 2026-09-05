import { createOAuthCookieFlow as create } from "../../fluent-api/auth/oauth-cookie-flow.ts";
import type { OAuthCookieFlowOptions } from "../../fluent-api/auth/oauth-cookie-flow.ts";
import type { FluentProviderTypes } from "../provider-types.ts";
import type { FluentProvider } from "../../fluent-api/adapter-contract/provider.ts";
import type { OAuthCookieFlow, OAuthHandler } from "../contracts/auth.ts";

/** Preserve catalog provider types through cookie-based OAuth completion. */
export function createOAuthCookieFlow<P extends FluentProvider>(
  oauth: OAuthHandler<P>,
  options: OAuthCookieFlowOptions,
): OAuthCookieFlow<P> {
  return create<P, FluentProviderTypes>(oauth, options);
}
