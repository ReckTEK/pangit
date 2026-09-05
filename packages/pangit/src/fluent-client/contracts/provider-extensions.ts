import type * as Contract from "../../fluent-api/mod.ts";
import type { FluentProviderTypes } from "../provider-types.ts";

export type ProviderExtensions<P extends string> = Contract.ProviderExtensions<
  P,
  FluentProviderTypes
>;

/**
 * Common operation plus only the extension method registered for its selected provider/version.
 * Configuring an extension returns the terminal form, so one callback cannot run twice.
 * Context and option data are structured-cloned; their records and arrays are frozen.
 */
export type OperationExtension<
  TOperation extends Contract.RegisteredOperation,
  TProvider extends string,
  TVersion extends string,
  TDefaultResult,
> = Contract.OperationExtension<
  TOperation,
  TProvider,
  TVersion,
  TDefaultResult,
  FluentProviderTypes
>;

export type ProviderExtensionRegistry = Contract.ProviderExtensionRegistry<FluentProviderTypes>;

export type RegisteredProvider<O extends Contract.RegisteredOperation> =
  Contract.RegisteredProvider<O, FluentProviderTypes>;

export type ProviderExtensionContext<O extends Contract.RegisteredOperation, P extends string> =
  Contract.ProviderExtensionContext<O, P, FluentProviderTypes>;

export type ProviderExtensionOptions<O extends Contract.RegisteredOperation, P extends string> =
  Contract.ProviderExtensionOptions<O, P, FluentProviderTypes>;

export type ProviderExtensionResult<
  O extends Contract.RegisteredOperation,
  P extends string,
  Default,
> = Contract.ProviderExtensionResult<O, P, Default, FluentProviderTypes>;

export type ProviderExtensionSupportedVersion<
  O extends Contract.RegisteredOperation,
  P extends string,
> = Contract.ProviderExtensionSupportedVersion<O, P, FluentProviderTypes>;

export type ProviderExtensionSupportsVersion<
  O extends Contract.RegisteredOperation,
  P extends string,
  V extends string,
> = Contract.ProviderExtensionSupportsVersion<O, P, V, FluentProviderTypes>;
