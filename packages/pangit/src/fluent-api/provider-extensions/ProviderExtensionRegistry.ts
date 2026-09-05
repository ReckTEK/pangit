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

export type ProviderExtensionRegistry = {
  readonly [P in keyof ProviderTypeRegistry]: ProviderTypeRegistry[P] extends
    { readonly extensions: infer E } ? E : never;
};
export type RegisteredProvider<O extends RegisteredOperation> =
  & {
    [P in keyof ProviderExtensionRegistry]: O extends keyof ProviderExtensionRegistry[P] ? P
      : never;
  }[keyof ProviderExtensionRegistry]
  & string;
type Definition<O extends RegisteredOperation, P extends string> = P extends
  keyof ProviderExtensionRegistry
  ? O extends keyof ProviderExtensionRegistry[P] ? ProviderExtensionRegistry[P][O] : never
  : never;
type ExtensionField<
  Definition,
  Key extends keyof ProviderExtensionDefinition<object, object, object, string>,
> = Definition extends ProviderExtensionDefinition<object, object, object, string> ? Definition[Key]
  : never;

export type ProviderExtensionContext<O extends RegisteredOperation, P extends string> =
  ExtensionField<Definition<O, P>, "context">;
export type ProviderExtensionOptions<O extends RegisteredOperation, P extends string> =
  ExtensionField<Definition<O, P>, "options">;
export type ProviderExtensionResult<O extends RegisteredOperation, P extends string, Default> =
  [ExtensionField<Definition<O, P>, "result">] extends [never] ? Default
    : ExtensionField<Definition<O, P>, "result">;
export type ProviderExtensionSupportedVersion<O extends RegisteredOperation, P extends string> =
  ExtensionField<Definition<O, P>, "supportedVersion">;
export type ProviderExtensionSupportsVersion<
  O extends RegisteredOperation,
  P extends string,
  V extends string,
> = P extends RegisteredProvider<O>
  ? [ProviderExtensionSupportedVersion<O, P>] extends [never] ? true
  : [V] extends [ProviderExtensionSupportedVersion<O, P>] ? true
  : false
  : false;
