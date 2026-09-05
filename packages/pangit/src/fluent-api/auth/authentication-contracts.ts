import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";
import type {
  ProviderExtensionOptions,
  ProviderExtensionSupportsVersion,
} from "../provider-extensions/ProviderExtensionRegistry.ts";

import type { BasicAuthorizationInput } from "../adapter-contract/authentication.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";

import type { FluentClient } from "../client/FluentClient.ts";
import type { Login, LoginOptions } from "./oauth-contracts.ts";

/** A value returned immediately or asynchronously. */
export type MaybePromise<TValue> = TValue | Promise<TValue>;

/** Fluent provider-specific Basic authentication selection. */
export type BasicAuthorization<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> =
  & {
    authorize(options?: OperationOptions): Promise<FluentClient<TProvider, TVersion, TRegistry>>;
  }
  & (ProviderExtensionSupportsVersion<"auth.basic", TProvider, TVersion, TRegistry> extends true ? {
      readonly [P in TProvider]: (
        configure: () => MaybePromise<ProviderExtensionOptions<"auth.basic", TProvider, TRegistry>>,
      ) => BasicAuthorization<TProvider, TVersion, TRegistry>;
    }
    : Record<never, never>);

/** Authentication capability for one selected provider client. */
export interface Auth<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  token(
    token: string,
    options?: OperationOptions,
  ): Promise<FluentClient<TProvider, TVersion, TRegistry>>;
  login(options: LoginOptions): Login<TProvider, TVersion, TRegistry>;
  basic(
    input: BasicAuthorizationInput,
  ): BasicAuthorization<TProvider, TVersion, TRegistry>;
}
