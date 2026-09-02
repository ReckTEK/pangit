import type {
  GiteaSetCommitStatusExtension,
  GiteaSetCommitStatusExtensionContext,
} from "../adapter-contract/commit-statuses.ts";
import type {
  GiteaCommitComparisonOutput,
  GiteaCompareCommitsExtension,
  GiteaCompareCommitsExtensionContext,
} from "../adapter-contract/commits.ts";
import type {
  GiteaCommitFileChangesExtension,
  GiteaCommitFileChangesExtensionContext,
} from "../adapter-contract/content.ts";
import type {
  GiteaMergePullRequestExtension,
  GiteaMergePullRequestExtensionContext,
} from "../adapter-contract/pull-requests.ts";
import type {
  GiteaBranchRuleOrderExtension,
  GiteaBranchRuleOrderExtensionContext,
} from "../adapter-contract/optional/branch-rules.ts";
import type {
  GiteaIssueUpdateExtension,
  GiteaIssueUpdateExtensionContext,
} from "../adapter-contract/optional/issues.ts";
import type {
  GiteaCreatePullRequestReviewExtension,
  GiteaCreatePullRequestReviewExtensionContext,
} from "../adapter-contract/optional/pull-request-reviews.ts";

/** One operation-scoped provider extension registered with its callback context and options. */
export interface ProviderExtensionDefinition<
  TContext extends object,
  TOptions extends object,
  TResult = never,
  TSupportedVersion extends string = never,
> {
  readonly context: TContext;
  readonly options: TOptions;
  /** Override the common operation result only when the provider mode returns another shape. */
  readonly result: TResult;
  /** Restrict the extension to exact provider versions; `never` means every registered version. */
  readonly supportedVersion: TSupportedVersion;
}

/**
 * Explicit registry for provider enhancements that belong to one fluent operation.
 *
 * Operation-specific context and option types remain owned by their concern contracts. This
 * registry deliberately carries no raw client surface.
 */
export interface ProviderExtensionRegistry {
  readonly "commits.compare": {
    readonly gitea: ProviderExtensionDefinition<
      GiteaCompareCommitsExtensionContext,
      GiteaCompareCommitsExtension,
      GiteaCommitComparisonOutput,
      "1.27.2"
    >;
  };
  readonly "content.commitChanges": {
    readonly gitea: ProviderExtensionDefinition<
      GiteaCommitFileChangesExtensionContext,
      GiteaCommitFileChangesExtension
    >;
  };
  readonly "pullRequests.merge": {
    readonly gitea: ProviderExtensionDefinition<
      GiteaMergePullRequestExtensionContext,
      GiteaMergePullRequestExtension
    >;
  };
  readonly "pullRequestReviews.create": {
    readonly gitea: ProviderExtensionDefinition<
      GiteaCreatePullRequestReviewExtensionContext,
      GiteaCreatePullRequestReviewExtension
    >;
  };
  readonly "statuses.set": {
    readonly gitea: ProviderExtensionDefinition<
      GiteaSetCommitStatusExtensionContext,
      GiteaSetCommitStatusExtension
    >;
  };
  readonly "issues.update": {
    readonly gitea: ProviderExtensionDefinition<
      GiteaIssueUpdateExtensionContext,
      GiteaIssueUpdateExtension
    >;
  };
  readonly "branchRules.setOrder": {
    readonly gitea: ProviderExtensionDefinition<
      GiteaBranchRuleOrderExtensionContext,
      GiteaBranchRuleOrderExtension
    >;
  };
}

export type RegisteredOperation = keyof ProviderExtensionRegistry;

export type RegisteredProvider<TOperation extends RegisteredOperation> =
  & keyof ProviderExtensionRegistry[TOperation]
  & string;

type RegisteredDefinition<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
> = ProviderExtensionRegistry[TOperation][TProvider];

export type ProviderExtensionContext<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
> = RegisteredDefinition<TOperation, TProvider> extends
  ProviderExtensionDefinition<infer TContext, object, unknown, string> ? TContext : never;

export type ProviderExtensionOptions<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
> = RegisteredDefinition<TOperation, TProvider> extends
  ProviderExtensionDefinition<object, infer TOptions, unknown, string> ? TOptions : never;

type RegisteredExtensionResult<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
> = RegisteredDefinition<TOperation, TProvider> extends
  ProviderExtensionDefinition<object, object, infer TResult, string> ? TResult : never;

/** Result returned after selecting the provider extension, or the common result by default. */
export type ProviderExtensionResult<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
  TDefaultResult,
> = [RegisteredExtensionResult<TOperation, TProvider>] extends [never] ? TDefaultResult
  : RegisteredExtensionResult<TOperation, TProvider>;

/** Exact versions on which one extension is available; `never` denotes every version. */
export type ProviderExtensionSupportedVersion<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
> = RegisteredDefinition<TOperation, TProvider> extends
  ProviderExtensionDefinition<object, object, unknown, infer TVersion> ? TVersion : never;

/** Whether one exact selected provider version exposes the registered extension method. */
export type ProviderExtensionSupportsVersion<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
  TVersion extends string,
> = [ProviderExtensionSupportedVersion<TOperation, TProvider>] extends [never] ? true
  : [TVersion] extends [ProviderExtensionSupportedVersion<TOperation, TProvider>] ? true
  : false;

type RuntimeVersionSupport<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
> = [ProviderExtensionSupportedVersion<TOperation, TProvider>] extends [never] ? "all"
  : readonly ProviderExtensionSupportedVersion<TOperation, TProvider>[];

type RuntimeProviderExtensionRegistry = {
  readonly [TOperation in RegisteredOperation]: {
    readonly [TProvider in RegisteredProvider<TOperation>]: RuntimeVersionSupport<
      TOperation,
      TProvider
    >;
  };
};

/** Runtime mirror of the type registry; prevents erased TypeScript restrictions from leaking. */
export const providerExtensionVersionSupport = Object.freeze({
  "commits.compare": Object.freeze({ gitea: Object.freeze(["1.27.2"] as const) }),
  "content.commitChanges": Object.freeze({ gitea: "all" as const }),
  "pullRequests.merge": Object.freeze({ gitea: "all" as const }),
  "pullRequestReviews.create": Object.freeze({ gitea: "all" as const }),
  "statuses.set": Object.freeze({ gitea: "all" as const }),
  "issues.update": Object.freeze({ gitea: "all" as const }),
  "branchRules.setOrder": Object.freeze({ gitea: "all" as const }),
}) satisfies RuntimeProviderExtensionRegistry;

/** Check the selected exact version before installing an operation extension method. */
export function isProviderExtensionVersionSupported<
  TOperation extends RegisteredOperation,
  TProvider extends RegisteredProvider<TOperation>,
>(operation: TOperation, provider: TProvider, version: string): boolean {
  const support = (providerExtensionVersionSupport[operation] as Record<
    string,
    "all" | readonly string[]
  >)[provider];
  return support === "all" || support.includes(version);
}
