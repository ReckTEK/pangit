import type { Provider, ProviderVersion } from "../../providers/provider.ts";
import type { FluentClient } from "../FluentClient.ts";
import type { Login, LoginOptions } from "./oauth-contracts.ts";

/** A value returned immediately or asynchronously. */
export type MaybePromise<TValue> = TValue | Promise<TValue>;

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
  authorize(): Promise<FluentClient<TProvider, TVersion>>;
}

/** Authentication capability for one selected provider client. */
export interface Auth<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  token(token: string): Promise<FluentClient<TProvider, TVersion>>;
  login(options: LoginOptions): Login<TProvider, TVersion>;
  basic(): BasicAuthorization<TProvider, TVersion>;
}
