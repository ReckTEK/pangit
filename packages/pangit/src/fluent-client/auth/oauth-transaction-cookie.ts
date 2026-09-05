import { createOAuthTransactionCookie as create } from "../../fluent-api/auth/oauth-transaction-cookie/mod.ts";
import type { OAuthTransactionCookieOptions } from "../../fluent-api/auth/oauth-transaction-cookie/mod.ts";
import type { FluentProviderTypes } from "../provider-types.ts";
import type { FluentProvider } from "../../fluent-api/adapter-contract/provider.ts";
import type { OAuthTransactionCookie } from "../contracts/auth.ts";

/** Keep transaction provider/version types aligned with the public catalog. */
export function createOAuthTransactionCookie<P extends FluentProvider = FluentProvider>(
  options: OAuthTransactionCookieOptions,
): OAuthTransactionCookie<P> {
  return create<P, FluentProviderTypes>(options);
}
