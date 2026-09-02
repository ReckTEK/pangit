import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { BasicAuthorizationInput } from "../adapter-contract/authentication.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import type { FluentProvider } from "../provider-registry.ts";
import type { FluentClient } from "../FluentClient.ts";
import type { Login, LoginOptions } from "./oauth-contracts.ts";

/** A value returned immediately or asynchronously. */
export type MaybePromise<TValue> = TValue | Promise<TValue>;

/** A provider-specific payload declared without running the branch yet. */
export interface GiteaBasicAuthorizationExtension {
  readonly oneTimePassword?: string;
}

export type GiteaBasicAuthorizationBranch = () => MaybePromise<GiteaBasicAuthorizationExtension>;

/** Fluent provider-specific Basic authentication selection. */
export interface BasicAuthorization<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  gitea(branch: GiteaBasicAuthorizationBranch): this;
  authorize(options?: OperationOptions): Promise<FluentClient<TProvider, TVersion>>;
}

/** Authentication capability for one selected provider client. */
export interface Auth<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  token(token: string, options?: OperationOptions): Promise<FluentClient<TProvider, TVersion>>;
  login(options: LoginOptions): Login<TProvider, TVersion>;
  basic(
    input: Omit<BasicAuthorizationInput, "oneTimePassword">,
  ): BasicAuthorization<TProvider, TVersion>;
}
