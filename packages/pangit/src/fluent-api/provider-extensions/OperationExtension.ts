import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import {
  isProviderExtensionVersionSupported,
  type ProviderExtensionContext,
  type ProviderExtensionOptions,
  type ProviderExtensionResult,
  type ProviderExtensionSupportsVersion,
  type RegisteredOperation,
  type RegisteredProvider,
} from "./ProviderExtensionRegistry.ts";

/** The terminal form of an operation-specific provider extension builder. */
export interface ExecutableOperation<TResult> {
  execute(options?: OperationOptions): Promise<TResult>;
}

type ProviderExtensionMethod<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
  TVersion extends string,
  TDefaultResult,
> = ProviderExtensionSupportsVersion<TOperation, TProvider, TVersion> extends true ? {
    readonly [TKey in TProvider]: (
      configure: (
        context: Readonly<ProviderExtensionContext<TOperation, TProvider>>,
      ) => ProviderExtensionOptions<TOperation, TProvider>,
    ) => ExecutableOperation<ProviderExtensionResult<TOperation, TProvider, TDefaultResult>>;
  }
  : Record<never, never>;

/**
 * Common operation plus only the extension method registered for its selected provider/version.
 * Configuring an extension returns the terminal form, so one callback cannot run twice.
 */
export type OperationExtension<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
  TVersion extends string,
  TDefaultResult,
> =
  & ExecutableOperation<TDefaultResult>
  & ProviderExtensionMethod<TOperation, TProvider, TVersion, TDefaultResult>;

/** Build one immutable, single-configuration provider extension operation. */
export function createOperationExtension<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
  TVersion extends string,
  TDefaultResult,
>(input: {
  readonly operation: TOperation;
  readonly provider: TProvider;
  /** Carries the exact selected version into the returned compile-time extension surface. */
  readonly version: TVersion;
  readonly context: Readonly<ProviderExtensionContext<TOperation, TProvider>>;
  readonly execute: (
    extension: Readonly<ProviderExtensionOptions<TOperation, TProvider>> | undefined,
    options: OperationOptions,
  ) => Promise<
    TDefaultResult | ProviderExtensionResult<TOperation, TProvider, TDefaultResult>
  >;
}): OperationExtension<TOperation, TProvider, TVersion, TDefaultResult> {
  let configured = false;
  let extension: Readonly<ProviderExtensionOptions<TOperation, TProvider>> | undefined;
  const execute = (options: OperationOptions = {}) => input.execute(extension, options);
  const executable = Object.freeze({ execute });
  const builder = isProviderExtensionVersionSupported(
      input.operation,
      input.provider,
      input.version,
    )
    ? {
      ...executable,
      [input.provider](
        configure: (
          context: Readonly<ProviderExtensionContext<TOperation, TProvider>>,
        ) => ProviderExtensionOptions<TOperation, TProvider>,
      ) {
        if (configured) {
          throw new TypeError(
            `${String(input.operation)} provider extension is already configured`,
          );
        }
        configured = true;
        extension = Object.freeze({ ...configure(Object.freeze({ ...input.context })) });
        return executable;
      },
    }
    : executable;
  return Object.freeze(builder) as OperationExtension<
    TOperation,
    TProvider,
    TVersion,
    TDefaultResult
  >;
}
