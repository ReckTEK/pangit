import type { Provider, ProviderVersion } from "../adapter-contract/provider.ts";
/** Core normalized entity kinds with provider-native doors. */
export type ProviderCoreEntityNativeKind =
  | "branch"
  | "tag"
  | "commit"
  | "content"
  | "pullRequest"
  | "review"
  | "commitStatus";

/** Optional configured-rule and effective-protection native entity kinds. */
export type ProviderBranchRuleEntityNativeKind = "configuredRule" | "effectiveProtection";

/** Optional CI discovery native entity kinds. */
export type ProviderCiEntityNativeKind = "workflow" | "run" | "job" | "artifact";

/** Optional issue and issue-comment native entity kinds. */
export type ProviderIssueEntityNativeKind = "issue" | "issueComment";

/** Optional package-version and package-file native entity kinds. */
export type ProviderPackageEntityNativeKind = "package" | "packageFile";

/** Optional release and release-asset native entity kinds. */
export type ProviderReleaseEntityNativeKind = "release" | "releaseAsset";

/** Provider-owned native families indexed only through abstract registration. */
// deno-lint-ignore no-empty-interface
export interface ProviderNativeRegistry<V extends string, K extends ProviderNativeKind> {}
export type ProviderNativeKind =
  | ProviderCoreEntityNativeKind
  | ProviderBranchRuleEntityNativeKind
  | ProviderCiEntityNativeKind
  | ProviderIssueEntityNativeKind
  | ProviderPackageEntityNativeKind
  | ProviderReleaseEntityNativeKind
  | "client"
  | "repositoryContainer"
  | "repository"
  | "blob"
  | "currentUserProfile"
  | "pullRequestReview"
  | "repositoryWebhook";
type RegisteredProviderNative<
  P extends Provider,
  V extends ProviderVersion<P>,
  K extends ProviderNativeKind,
> = P extends keyof ProviderNativeRegistry<V, K> ? ProviderNativeRegistry<V, K>[P]
  : Record<never, never>;

/** Fluent-client native door narrowed to the selected implemented provider. */
export type ProviderClientNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "client">;

/** Repository-container native door narrowed to the selected implemented provider. */
export type ProviderRepositoryContainerNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "repositoryContainer">;

/** Repository native door narrowed to the selected implemented provider. */
export type ProviderRepositoryNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "repository">;

/** Core entity native door narrowed to the selected provider, version, and entity kind. */
export type ProviderEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderCoreEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional SHA-addressed blob native door. */
export type ProviderBlobNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "blob">;

/** Optional branch-rule native door narrowed by normalized entity kind. */
export type ProviderBranchRuleEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderBranchRuleEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional CI discovery native door narrowed by normalized entity kind. */
export type ProviderCiEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderCiEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional authenticated-user-profile native door. */
export type ProviderCurrentUserProfileNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "currentUserProfile">;

/** Optional issue native door narrowed by normalized entity kind. */
export type ProviderIssueEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderIssueEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional package native door narrowed by normalized entity kind. */
export type ProviderPackageEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderPackageEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional submitted pull-request review native door. */
export type ProviderPullRequestReviewNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "pullRequestReview">;

/** Optional release native door narrowed by normalized entity kind. */
export type ProviderReleaseEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
  TKind extends ProviderReleaseEntityNativeKind,
> = RegisteredProviderNative<TProvider, TVersion, TKind>;

/** Optional repository-webhook native door. */
export type ProviderRepositoryWebhookNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = RegisteredProviderNative<TProvider, TVersion, "repositoryWebhook">;
