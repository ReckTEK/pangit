import type { Provider, ProviderVersion } from "../generated/mod.ts";
import type { AuthorizedClient } from "../client/core.ts";

export type MaybePromise<TValue> = TValue | Promise<TValue>;

export interface TokenAuthorization {
  readonly token: string;
}

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

export type OAuthLoginTransactionFor<TProvider extends Provider> = {
  [TSelected in TProvider]: OAuthLoginTransaction<TSelected, ProviderVersion<TSelected>>;
}[TProvider];

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

/** A provider-specific payload declared without running the branch yet. */
export type AuthBranch = () => MaybePromise<Readonly<Record<string, unknown>>>;

export interface BasicAuthorization<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  gitea(branch: AuthBranch): this;
  codeberg(branch: AuthBranch): this;
  bitbucket(branch: AuthBranch): this;
  authorize(): Promise<AuthorizedClient<TProvider, TVersion>>;
}

export interface Auth<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  token(input: TokenAuthorization): Promise<AuthorizedClient<TProvider, TVersion>>;
  login(options: LoginOptions): Login<TProvider, TVersion>;
  basic(): BasicAuthorization<TProvider, TVersion>;
}
