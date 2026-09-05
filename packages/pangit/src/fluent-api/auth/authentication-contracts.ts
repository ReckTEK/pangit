import type {
  ProviderExtensionOptions,
  ProviderExtensionSupportsVersion,
} from "../provider-extensions/ProviderExtensionRegistry.ts";
import type { FluentProvider, ProviderVersion } from "../adapter-contract/provider.ts";
import type { BasicAuthorizationInput } from "../adapter-contract/authentication.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";

import type { FluentClient } from "../client/FluentClient.ts";
import type { Login, LoginOptions } from "./oauth-contracts.ts";

/** A value returned immediately or asynchronously. */
export type MaybePromise<TValue> = TValue | Promise<TValue>;

/** Fluent provider-specific Basic authentication selection. */
export type BasicAuthorization<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> =
  & {
    authorize(options?: OperationOptions): Promise<FluentClient<TProvider, TVersion>>;
  }
  & (ProviderExtensionSupportsVersion<"auth.basic", TProvider, TVersion> extends true ? {
      readonly [P in TProvider]: (
        configure: () => MaybePromise<ProviderExtensionOptions<"auth.basic", TProvider>>,
      ) => BasicAuthorization<TProvider, TVersion>;
    }
    : Record<never, never>);

/** Authentication capability for one selected provider client. */
export interface Auth<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  token(token: string, options?: OperationOptions): Promise<FluentClient<TProvider, TVersion>>;
  login(options: LoginOptions): Login<TProvider, TVersion>;
  basic(
    input: BasicAuthorizationInput,
  ): BasicAuthorization<TProvider, TVersion>;
}
