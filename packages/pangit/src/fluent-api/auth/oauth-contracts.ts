import type { FluentProvider, ProviderVersion } from "../adapter-contract/provider.ts";
import type { OAuthTokenData } from "../adapter-contract/authentication.ts";

import type { FluentClient } from "../client/FluentClient.ts";

/** Common inputs needed to begin a provider-hosted OAuth login. */
export interface LoginOptions {
  readonly clientId: string;
  readonly clientSecret?: string;
  readonly callbackUrl: string | URL;
  readonly scopes?: readonly string[];
}

/** Caller-owned, short-lived proof needed to complete one OAuth login hop. */
export interface OAuthLoginTransaction<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly state: string;
  readonly codeVerifier: string;
  readonly callbackUrl: string;
  readonly providerTransaction?: Readonly<Record<string, string>>;
}

/** Provider login URL plus the transaction the caller must retain until callback. */
export interface OAuthLoginStart<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly url: URL;
  readonly transaction: OAuthLoginTransaction<TProvider, TVersion>;
}

/** Standard OAuth token values returned after the authorization-code exchange. */
export interface OAuthAuthorization {
  readonly method: "oauth";
  readonly accessToken: string;
  readonly tokenType: string;
  readonly expiresIn?: number;
  readonly refreshToken?: string;
  readonly scope?: string;
}

/** Authorized PanGit client returned by a completed OAuth login. */
export interface OAuthAuthorizedClient<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> extends FluentClient<TProvider, TVersion> {
  readonly authorization: OAuthAuthorization;
}

/** Build a fluent client after a provider OAuth flow acquires credentials. */
export type OAuthClientAuthorizer<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = (
  token: OAuthTokenData,
  authorization: OAuthAuthorization,
  signal?: AbortSignal,
) => Promise<OAuthAuthorizedClient<TProvider, TVersion>>;

/** Two-part OAuth flow: begin the login hop, then authorize its native callback request. */
export interface Login<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly options: LoginOptions;
  start(): Promise<OAuthLoginStart<TProvider, TVersion>>;
  authorize(
    callback: Request,
    transaction: OAuthLoginTransaction<TProvider, TVersion>,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion>>;
}

/** Provider logins configured behind one shared callback endpoint. */
export type OAuthLoginRegistry = Partial<
  {
    [TProvider in FluentProvider]: Login<TProvider, ProviderVersion<TProvider>>;
  }
>;

/** OAuth transaction narrowed to one or more selected providers. */
export type OAuthLoginTransactionFor<TProvider extends FluentProvider> = {
  [TSelected in TProvider]: OAuthLoginTransaction<TSelected, ProviderVersion<TSelected>>;
}[TProvider];

/** OAuth-authorized client narrowed to one or more selected providers. */
export type OAuthAuthorizedClientFor<TProvider extends FluentProvider> = {
  [TSelected in TProvider]: OAuthAuthorizedClient<TSelected, ProviderVersion<TSelected>>;
}[TProvider];

/** Runtime-neutral OAuth dispatcher shared by browser, server, and CLI integrations. */
export interface OAuthHandler<TProvider extends FluentProvider = FluentProvider> {
  start<TSelected extends TProvider>(
    provider: TSelected,
  ): Promise<OAuthLoginStart<TSelected, ProviderVersion<TSelected>>>;
  authorize(
    callback: Request,
    transaction: OAuthLoginTransactionFor<TProvider>,
  ): Promise<OAuthAuthorizedClientFor<TProvider>>;
}
