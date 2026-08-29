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

/** Two-part OAuth flow: begin the login hop, then authorize its callback. */
export interface Login<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly options: LoginOptions;
  start(): Promise<URL>;
  authorize(callback: Request): Promise<AuthorizedClient<TProvider, TVersion>>;
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
