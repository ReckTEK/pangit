import { createOAuthHandler as create } from "../../fluent-api/auth/oauth-handler.ts";
import type { FluentProviderTypes } from "../provider-types.ts";
import type { OAuthHandler, OAuthLoginRegistry } from "../contracts/auth.ts";

/** Bind the selected logins to the public catalog without modifying shared contracts. */
export function createOAuthHandler<const TLogins extends OAuthLoginRegistry>(
  logins: TLogins,
): OAuthHandler<Extract<keyof TLogins, string>> {
  return create<TLogins, FluentProviderTypes>(logins);
}
