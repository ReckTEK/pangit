import type { ProviderNativeKind } from "../../fluent-api/native-access/ProviderNativeRegistry.ts";
import type { ProviderExtensionDefinition } from "../../fluent-api/provider-extensions/ProviderExtensionRegistry.ts";
import type {
  GiteaCommitComparisonOutput,
  GiteaCompareCommitsExtension,
  GiteaCompareCommitsExtensionContext,
} from "./extensions/commits.ts";
import type {
  GiteaCommitFileChangesExtension,
  GiteaCommitFileChangesExtensionContext,
} from "./extensions/content.ts";
import type {
  GiteaMergePullRequestExtension,
  GiteaMergePullRequestExtensionContext,
} from "./extensions/pull-requests.ts";
import type {
  GiteaCreatePullRequestReviewExtension,
  GiteaCreatePullRequestReviewExtensionContext,
} from "./extensions/pull-request-reviews.ts";
import type {
  GiteaSetCommitStatusExtension,
  GiteaSetCommitStatusExtensionContext,
} from "./extensions/commit-statuses.ts";
import type {
  GiteaIssueUpdateExtension,
  GiteaIssueUpdateExtensionContext,
} from "./extensions/issues.ts";
import type {
  GiteaBranchRuleOrderExtension,
  GiteaBranchRuleOrderExtensionContext,
} from "./extensions/branch-rules.ts";
import type { GiteaBasicAuthorizationExtension } from "./extensions/basic-authorization.ts";
import type { GiteaProviderNativeRegistry } from "./native/registry.ts";
import type { GiteaVersion } from "./native/GiteaEntityNative.ts";
export interface GiteaExtensionRegistry {
  readonly "commits.compare": ProviderExtensionDefinition<
    GiteaCompareCommitsExtensionContext,
    GiteaCompareCommitsExtension,
    GiteaCommitComparisonOutput,
    "1.27.2"
  >;
  readonly "content.commitChanges": ProviderExtensionDefinition<
    GiteaCommitFileChangesExtensionContext,
    GiteaCommitFileChangesExtension,
    never,
    never
  >;
  readonly "pullRequests.merge": ProviderExtensionDefinition<
    GiteaMergePullRequestExtensionContext,
    GiteaMergePullRequestExtension,
    never,
    never
  >;
  readonly "pullRequestReviews.create": ProviderExtensionDefinition<
    GiteaCreatePullRequestReviewExtensionContext,
    GiteaCreatePullRequestReviewExtension,
    never,
    never
  >;
  readonly "statuses.set": ProviderExtensionDefinition<
    GiteaSetCommitStatusExtensionContext,
    GiteaSetCommitStatusExtension,
    never,
    never
  >;
  readonly "issues.update": ProviderExtensionDefinition<
    GiteaIssueUpdateExtensionContext,
    GiteaIssueUpdateExtension,
    never,
    never
  >;
  readonly "branchRules.setOrder": ProviderExtensionDefinition<
    GiteaBranchRuleOrderExtensionContext,
    GiteaBranchRuleOrderExtension,
    never,
    never
  >;
  readonly "auth.basic": ProviderExtensionDefinition<
    Record<never, never>,
    GiteaBasicAuthorizationExtension,
    never,
    never
  >;
}
declare module "../../fluent-api/adapter-contract/provider.ts" {
  interface ProviderTypeRegistry {
    readonly gitea: {
      readonly versions: GiteaVersion;
      readonly extensions: GiteaExtensionRegistry;
    };
  }
}

declare module "../../fluent-api/native-access/ProviderNativeRegistry.ts" {
  interface ProviderNativeRegistry<V extends string, K extends ProviderNativeKind> {
    readonly gitea: GiteaProviderNativeRegistry<V & GiteaVersion>[K];
  }
}
