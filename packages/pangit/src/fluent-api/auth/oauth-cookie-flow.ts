import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import {
  createOAuthTransactionCookie,
  type OAuthTransactionCookie,
  type OAuthTransactionCookieOptions,
} from "./oauth-transaction-cookie/mod.ts";
import type { OAuthAuthorizedClientFor, OAuthHandler, OAuthLoginStart } from "./oauth-contracts.ts";
import { OAuthCallbackError } from "./OAuthCallbackError.ts";

export interface OAuthCookieFlowOptions {
  readonly cookie: OAuthTransactionCookieOptions;
  /** Native redirect status used for the provider login hop. Defaults to 302. */
  readonly redirectStatus?: 302 | 303;
}

export type OAuthCookieCompletion<
  TProvider extends FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> =
  | Readonly<{
    ok: true;
    authorized: OAuthAuthorizedClientFor<TProvider, TRegistry>;
    /** Propagate these headers on the application response to clear the transaction cookie. */
    headers: Headers;
  }>
  | Readonly<{
    ok: false;
    error: Error;
    /** Propagate these headers on the application response to clear the transaction cookie. */
    headers: Headers;
  }>;

/**
 * Framework-neutral OAuth orchestration backed by a short-lived encrypted browser cookie.
 * It owns only protocol transaction state; application login sessions remain caller-owned.
 */
export interface OAuthCookieFlow<
  TProvider extends FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly oauth: OAuthHandler<TProvider, TRegistry>;
  readonly cookie: OAuthTransactionCookie<TProvider, TRegistry>;
  /** Begin login and return a native redirect Response containing the transaction cookie. */
  start<TSelected extends TProvider>(provider: TSelected): Promise<Response>;
  /** Consume the callback Request and return the authorization result plus clear-cookie headers. */
  complete(request: Request): Promise<OAuthCookieCompletion<TProvider, TRegistry>>;
}

/** Add native cookie transaction handling to an existing low-level OAuth handler. */
export function createOAuthCookieFlow<
  TProvider extends FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  oauth: OAuthHandler<TProvider, TRegistry>,
  options: OAuthCookieFlowOptions,
): OAuthCookieFlow<TProvider, TRegistry> {
  const cookie = createOAuthTransactionCookie<TProvider, TRegistry>(options.cookie);
  const redirectStatus = options.redirectStatus ?? 302;
  if (redirectStatus !== 302 && redirectStatus !== 303) {
    throw new TypeError("OAuth redirectStatus must be 302 or 303");
  }

  return Object.freeze({
    oauth,
    cookie,
    async start<TSelected extends TProvider>(provider: TSelected): Promise<Response> {
      const started: OAuthLoginStart<TSelected, ProviderVersion<TSelected, TRegistry>, TRegistry> =
        await oauth.start(
          provider,
        );
      const headers = new Headers({
        "cache-control": "no-store",
        location: started.url.href,
        "set-cookie": await cookie.set(started.transaction),
      });
      return new Response(null, { headers, status: redirectStatus });
    },
    async complete(request: Request): Promise<OAuthCookieCompletion<TProvider, TRegistry>> {
      const headers = new Headers({
        "cache-control": "no-store",
        "set-cookie": cookie.clear(request),
      });
      try {
        const transaction = await cookie.read(request);
        if (transaction === undefined) {
          throw new OAuthCallbackError(
            "missing_transaction",
            "No OAuth login transaction cookie was provided",
          );
        }
        const authorized = await oauth.authorize(request, transaction);
        return Object.freeze({ ok: true as const, authorized, headers });
      } catch (cause) {
        const error = cause instanceof Error
          ? cause
          : new Error("OAuth callback failed with a non-Error value", { cause });
        return Object.freeze({ ok: false as const, error, headers });
      }
    },
  });
}
