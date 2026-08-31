import type { RestClientTypeMap } from "../providers/clients.ts";
import type { AuthorizedClient } from "../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../providers/provider.ts";

/** Common inputs needed to begin a provider-hosted OAuth login. */
export interface LoginOptions {
  readonly clientId: string;
  readonly callbackUrl: string | URL;
  readonly scopes?: readonly string[];
}

/** Caller-owned, short-lived proof needed to complete one OAuth login hop. */
export interface OAuthLoginTransaction<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly state: string;
  readonly codeVerifier: string;
  readonly callbackUrl: string;
}

/** Provider login URL plus the transaction the caller must retain until callback. */
export interface OAuthLoginStart<
  TProvider extends Provider,
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
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> extends AuthorizedClient<TProvider, TVersion> {
  readonly authorization: OAuthAuthorization;
  /** The selected provider's authenticated, generated REST client. */
  readonly rest: RestClientTypeMap[TProvider][TVersion];
}

/** Two-part OAuth flow: begin the login hop, then authorize its native callback request. */
export interface Login<
  TProvider extends Provider,
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

/** Provider logins configured behind one universal callback endpoint. */
export type OAuthLoginRegistry = Partial<
  {
    [TProvider in Provider]: Login<TProvider, ProviderVersion<TProvider>>;
  }
>;

/** OAuth transaction narrowed to one or more selected providers. */
export type OAuthLoginTransactionFor<TProvider extends Provider> = {
  [TSelected in TProvider]: OAuthLoginTransaction<TSelected, ProviderVersion<TSelected>>;
}[TProvider];

/** OAuth-authorized client narrowed to one or more selected providers. */
export type OAuthAuthorizedClientFor<TProvider extends Provider> = {
  [TSelected in TProvider]: OAuthAuthorizedClient<TSelected, ProviderVersion<TSelected>>;
}[TProvider];

/** Runtime-neutral OAuth dispatcher shared by browser, server, and CLI integrations. */
export interface OAuthHandler<TProvider extends Provider = Provider> {
  start<TSelected extends TProvider>(
    provider: TSelected,
  ): Promise<OAuthLoginStart<TSelected, ProviderVersion<TSelected>>>;
  authorize(
    callback: Request,
    transaction: OAuthLoginTransactionFor<TProvider>,
  ): Promise<OAuthAuthorizedClientFor<TProvider>>;
}
