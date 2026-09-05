import type * as Contract from "../../fluent-api/mod.ts";
import type { FluentProviderTypes } from "../provider-types.ts";

/** Authentication capability for one selected provider client. */
export type Auth<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.auth.Auth<TProvider, TVersion, FluentProviderTypes>;

/** Fluent provider-specific Basic authentication selection. */
export type BasicAuthorization<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.auth.BasicAuthorization<TProvider, TVersion, FluentProviderTypes>;

export type OAuthCookieCompletion<TProvider extends Contract.FluentProvider> =
  Contract.auth.OAuthCookieCompletion<TProvider, FluentProviderTypes>;

/**
 * Framework-neutral OAuth orchestration backed by a short-lived encrypted browser cookie.
 * It owns only protocol transaction state; application login sessions remain caller-owned.
 */
export type OAuthCookieFlow<TProvider extends Contract.FluentProvider> =
  Contract.auth.OAuthCookieFlow<TProvider, FluentProviderTypes>;

/** Two-part OAuth flow: begin the login hop, then authorize its native callback request. */
export type Login<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.auth.Login<TProvider, TVersion, FluentProviderTypes>;

/** Authorized PanGit client returned by a completed OAuth login. */
export type OAuthAuthorizedClient<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.auth.OAuthAuthorizedClient<TProvider, TVersion, FluentProviderTypes>;

/** OAuth-authorized client narrowed to one or more selected providers. */
export type OAuthAuthorizedClientFor<TProvider extends Contract.FluentProvider> =
  Contract.auth.OAuthAuthorizedClientFor<TProvider, FluentProviderTypes>;

/** Runtime-neutral OAuth dispatcher shared by browser, server, and CLI integrations. */
export type OAuthHandler<TProvider extends Contract.FluentProvider = Contract.FluentProvider> =
  Contract.auth.OAuthHandler<TProvider, FluentProviderTypes>;

/** Provider logins configured behind one shared callback endpoint. */
export type OAuthLoginRegistry = Contract.auth.OAuthLoginRegistry<FluentProviderTypes>;

/** Provider login URL plus the transaction the caller must retain until callback. */
export type OAuthLoginStart<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.auth.OAuthLoginStart<TProvider, TVersion, FluentProviderTypes>;

/** Caller-owned, short-lived proof needed to complete one OAuth login hop. */
export type OAuthLoginTransaction<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.auth.OAuthLoginTransaction<TProvider, TVersion, FluentProviderTypes>;

/** OAuth transaction narrowed to one or more selected providers. */
export type OAuthLoginTransactionFor<TProvider extends Contract.FluentProvider> =
  Contract.auth.OAuthLoginTransactionFor<TProvider, FluentProviderTypes>;

/**
 * Framework-neutral encrypted transaction storage for an OAuth callback cookie.
 *
 * Set and clear return native Set-Cookie header values. Read consumes the native
 * callback request and needs no HTTP framework adapter. Cookies are always HttpOnly.
 */
export type OAuthTransactionCookie<
  TProvider extends Contract.FluentProvider = Contract.FluentProvider,
> = Contract.auth.OAuthTransactionCookie<TProvider, FluentProviderTypes>;
