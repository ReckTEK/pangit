import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";

import type { OAuthLoginTransaction, OAuthLoginTransactionFor } from "../oauth-contracts.ts";

import type { payloadVersion } from "./validation.ts";

export type OAuthCookieSameSite = "Strict" | "Lax" | "None";

export type OAuthTransactionCookieSecret = string | Uint8Array | CryptoKey;

export type OAuthTransactionCookieErrorCode = "invalid_transaction" | "expired_transaction";

/** Native cookie policy for one short-lived OAuth login transaction. */
export interface OAuthTransactionCookieOptions {
  /** At least 32 bytes, or an AES-GCM key with encrypt and decrypt usage. */
  readonly secret: OAuthTransactionCookieSecret;
  /** Cookie name. Defaults to `pangit_oauth`. */
  readonly name?: string;
  /** Cookie path. Defaults to the OAuth callback pathname. */
  readonly path?: string;
  /** Optional cookie Domain attribute. Omitted by default. */
  readonly domain?: string;
  /** Secure attribute. Defaults to whether the OAuth callback uses HTTPS. */
  readonly secure?: boolean;
  /** SameSite policy. Defaults to `Lax`. */
  readonly sameSite?: OAuthCookieSameSite;
  /** Cookie and encrypted-payload lifetime in seconds. Defaults to 600. */
  readonly maxAgeSeconds?: number;
}

/**
 * Framework-neutral encrypted transaction storage for an OAuth callback cookie.
 *
 * Set and clear return native Set-Cookie header values. Read consumes the native
 * callback request and needs no HTTP framework adapter. Cookies are always HttpOnly.
 */
export interface OAuthTransactionCookie<
  TProvider extends FluentProvider = FluentProvider,
> {
  readonly name: string;

  set<
    TSelected extends TProvider,
    TVersion extends ProviderVersion<TSelected>,
  >(
    transaction: OAuthLoginTransaction<TSelected, TVersion>,
  ): Promise<string>;

  read(
    request: Request,
  ): Promise<OAuthLoginTransactionFor<TProvider> | undefined>;

  clear(request: Request): string;
}

export interface CookiePayload {
  readonly version: typeof payloadVersion;
  readonly expiresAt: number;
  readonly transaction: OAuthLoginTransactionFor<FluentProvider>;
}

export interface CookieOptions {
  readonly name: string;
  readonly path?: string;
  readonly domain?: string;
  readonly secure?: boolean;
  readonly sameSite: OAuthCookieSameSite;
  readonly maxAgeSeconds: number;
}

export interface ResolvedCookiePolicy {
  readonly name: string;
  readonly path: string;
  readonly domain?: string;
  readonly secure: boolean;
  readonly sameSite: OAuthCookieSameSite;
}
