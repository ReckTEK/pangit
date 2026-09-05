import type { ValidationErrorContext } from "../adapter-contract/errors.ts";
import { type ExtensionSupport, supportsExtension } from "./ExtensionSupport.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import { snapshotExtensionData } from "./snapshot-extension-data.ts";
import type {
  ProviderExtensionContext,
  ProviderExtensionOptions,
  ProviderExtensionResult,
  ProviderExtensionSupportsVersion,
  RegisteredOperation,
  RegisteredProvider,
} from "./ProviderExtensionRegistry.ts";

/** The terminal form of an operation-specific provider extension builder. */
export interface ExecutableOperation<TResult> {
  execute(options?: OperationOptions): Promise<TResult>;
}

type ProviderExtensionMethod<
  TOperation extends RegisteredOperation,
  TProvider extends string,
  TVersion extends string,
  TDefaultResult,
> = TProvider extends RegisteredProvider<TOperation>
  ? ProviderExtensionSupportsVersion<TOperation, TProvider, TVersion> extends true ? {
      readonly [TKey in TProvider]: (
        configure: (
          context: Readonly<ProviderExtensionContext<TOperation, TProvider>>,
        ) => ProviderExtensionOptions<TOperation, TProvider>,
      ) => ExecutableOperation<ProviderExtensionResult<TOperation, TProvider, TDefaultResult>>;
    }
  : Record<never, never>
  : Record<never, never>;

/**
 * Common operation plus only the extension method registered for its selected provider/version.
 * Configuring an extension returns the terminal form, so one callback cannot run twice.
 * Context and option data are structured-cloned; their records and arrays are frozen.
 */
export type OperationExtension<
  TOperation extends RegisteredOperation,
  TProvider extends string,
  TVersion extends string,
  TDefaultResult,
> =
  & ExecutableOperation<TDefaultResult>
  & ProviderExtensionMethod<TOperation, TProvider, TVersion, TDefaultResult>;

/** Build one immutable, single-configuration provider extension operation. */
export function createOperationExtension<
  TOperation extends RegisteredOperation,
  TProvider extends string,
  TVersion extends string,
  TDefaultResult,
>(input: {
  readonly operation: TOperation;
  readonly support?: ExtensionSupport<ProviderExtensionOptions<TOperation, TProvider>>;
  readonly validationContext?: ValidationErrorContext;
  readonly provider: TProvider;
  /** Carries the exact selected version into the returned compile-time extension surface. */
  readonly version: TVersion;
  readonly context: Readonly<object>;
  readonly execute: (
    extension:
      | Readonly<ProviderExtensionOptions<TOperation, TProvider>>
      | undefined,
    options: OperationOptions,
  ) => Promise<
    | TDefaultResult
    | ProviderExtensionResult<TOperation, TProvider, TDefaultResult>
  >;
}): OperationExtension<TOperation, TProvider, TVersion, TDefaultResult> {
  let configured = false;
  let extension:
    | Readonly<ProviderExtensionOptions<TOperation, TProvider>>
    | undefined;
  const execute = async (options: OperationOptions = {}) => {
    if (extension !== undefined) {
      input.support?.validate?.(
        extension,
        input.validationContext ??
          { provider: input.provider, version: input.version, operation: input.operation },
      );
    }
    return await input.execute(extension, options);
  };
  const executable = Object.freeze({ execute });
  const builder = supportsExtension(input.support, input.version)
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
        extension = snapshotExtensionData(
          configure(
            snapshotExtensionData(input.context) as Readonly<
              ProviderExtensionContext<TOperation, TProvider>
            >,
          ),
        );
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
