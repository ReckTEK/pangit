import type { ProviderTypeRegistry } from "../adapter-contract/provider.ts";

/** A provider-owned extension of one universal operation. No provider policy lives here. */
export interface ProviderExtensionDefinition<
  TContext extends object,
  TOptions extends object,
  TResult extends object = never,
  TSupportedVersion extends string = never,
> {
  readonly context: TContext;
  readonly options: TOptions;
  readonly result: TResult;
  readonly supportedVersion: TSupportedVersion;
}

export type RegisteredOperation =
  | "auth.basic"
  | "commits.compare"
  | "content.commitChanges"
  | "pullRequests.merge"
  | "pullRequestReviews.create"
  | "statuses.set"
  | "issues.update"
  | "branchRules.setOrder";

export type ProviderExtensionRegistry<
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = {
  readonly [P in keyof TRegistry]: TRegistry[P] extends { readonly extensions: infer E } ? E
    : never;
};
export type RegisteredProvider<
  O extends RegisteredOperation,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> =
  & {
    [P in keyof ProviderExtensionRegistry<TRegistry>]: O extends
      keyof ProviderExtensionRegistry<TRegistry>[P] ? P
      : never;
  }[keyof ProviderExtensionRegistry<TRegistry>]
  & string;
type Definition<
  O extends RegisteredOperation,
  P extends string,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = P extends keyof ProviderExtensionRegistry<TRegistry>
  ? O extends keyof ProviderExtensionRegistry<TRegistry>[P]
    ? ProviderExtensionRegistry<TRegistry>[P][O]
  : never
  : never;
type ExtensionField<
  Definition,
  Key extends keyof ProviderExtensionDefinition<object, object, object, string>,
> = Definition extends ProviderExtensionDefinition<object, object, object, string> ? Definition[Key]
  : never;

export type ProviderExtensionContext<
  O extends RegisteredOperation,
  P extends string,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ExtensionField<Definition<O, P, TRegistry>, "context">;
export type ProviderExtensionOptions<
  O extends RegisteredOperation,
  P extends string,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ExtensionField<Definition<O, P, TRegistry>, "options">;
export type ProviderExtensionResult<
  O extends RegisteredOperation,
  P extends string,
  Default,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = [ExtensionField<Definition<O, P, TRegistry>, "result">] extends [never] ? Default
  : ExtensionField<Definition<O, P, TRegistry>, "result">;
export type ProviderExtensionSupportedVersion<
  O extends RegisteredOperation,
  P extends string,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ExtensionField<Definition<O, P, TRegistry>, "supportedVersion">;
export type ProviderExtensionSupportsVersion<
  O extends RegisteredOperation,
  P extends string,
  V extends string,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = P extends RegisteredProvider<O, TRegistry>
  ? [ProviderExtensionSupportedVersion<O, P, TRegistry>] extends [never] ? true
  : [V] extends [ProviderExtensionSupportedVersion<O, P, TRegistry>] ? true
  : false
  : false;
