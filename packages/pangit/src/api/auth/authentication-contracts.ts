import type { AuthorizedClient } from "../../providers/managed-client.ts";
import type { Provider, ProviderVersion } from "../../providers/provider.ts";
import type { Login, LoginOptions } from "./oauth-contracts.ts";

/** A value returned immediately or asynchronously. */
export type MaybePromise<TValue> = TValue | Promise<TValue>;

/** Static token credentials for one provider client. */
export interface TokenAuthorization {
  readonly token: string;
}

/** A provider-specific payload declared without running the branch yet. */
export type AuthBranch = () => MaybePromise<Readonly<Record<string, unknown>>>;

/** Fluent provider-specific Basic authentication selection. */
export interface BasicAuthorization<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  gitea(branch: AuthBranch): this;
  codeberg(branch: AuthBranch): this;
  bitbucket(branch: AuthBranch): this;
  authorize(): Promise<AuthorizedClient<TProvider, TVersion>>;
}

/** Authentication capability for one selected provider client. */
export interface Auth<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  token(input: TokenAuthorization): Promise<AuthorizedClient<TProvider, TVersion>>;
  login(options: LoginOptions): Login<TProvider, TVersion>;
  basic(): BasicAuthorization<TProvider, TVersion>;
}
