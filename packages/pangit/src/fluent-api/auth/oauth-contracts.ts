import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly url: URL;
  readonly transaction: OAuthLoginTransaction<TProvider, TVersion, TRegistry>;
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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends FluentClient<TProvider, TVersion, TRegistry> {
  readonly authorization: OAuthAuthorization;
}

/** Build a fluent client after a provider OAuth flow acquires credentials. */
export type OAuthClientAuthorizer<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = (
  token: OAuthTokenData,
  authorization: OAuthAuthorization,
  signal?: AbortSignal,
) => Promise<OAuthAuthorizedClient<TProvider, TVersion, TRegistry>>;

/** Two-part OAuth flow: begin the login hop, then authorize its native callback request. */
export interface Login<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly options: LoginOptions;
  start(): Promise<OAuthLoginStart<TProvider, TVersion, TRegistry>>;
  authorize(
    callback: Request,
    transaction: OAuthLoginTransaction<TProvider, TVersion, TRegistry>,
  ): Promise<OAuthAuthorizedClient<TProvider, TVersion, TRegistry>>;
}

/** Provider logins configured behind one shared callback endpoint. */
export type OAuthLoginRegistry<TRegistry extends ProviderTypeRegistry = Record<never, never>> =
  Partial<
    {
      [TProvider in FluentProvider]: Login<
        TProvider,
        ProviderVersion<TProvider, TRegistry>,
        TRegistry
      >;
    }
  >;

/** OAuth transaction narrowed to one or more selected providers. */
export type OAuthLoginTransactionFor<
  TProvider extends FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = {
  [TSelected in TProvider]: OAuthLoginTransaction<
    TSelected,
    ProviderVersion<TSelected, TRegistry>,
    TRegistry
  >;
}[TProvider];

/** OAuth-authorized client narrowed to one or more selected providers. */
export type OAuthAuthorizedClientFor<
  TProvider extends FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = {
  [TSelected in TProvider]: OAuthAuthorizedClient<
    TSelected,
    ProviderVersion<TSelected, TRegistry>,
    TRegistry
  >;
}[TProvider];

/** Runtime-neutral OAuth dispatcher shared by browser, server, and CLI integrations. */
export interface OAuthHandler<
  TProvider extends FluentProvider = FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  start<TSelected extends TProvider>(
    provider: TSelected,
  ): Promise<OAuthLoginStart<TSelected, ProviderVersion<TSelected, TRegistry>, TRegistry>>;
  authorize(
    callback: Request,
    transaction: OAuthLoginTransactionFor<TProvider, TRegistry>,
  ): Promise<OAuthAuthorizedClientFor<TProvider, TRegistry>>;
}
