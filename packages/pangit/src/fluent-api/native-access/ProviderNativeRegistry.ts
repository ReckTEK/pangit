import type {
  Provider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

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

/** Provider-owned native families selected from the explicit type composition. */
export type ProviderNativeRegistry<
  V extends string,
  K extends ProviderNativeKind,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = {
  readonly [P in keyof TRegistry]:
    (TRegistry[P]["native"] & { readonly version: V; readonly kind: K })["type"];
};
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
  V extends ProviderVersion<P, TRegistry>,
  K extends ProviderNativeKind,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = P extends keyof ProviderNativeRegistry<V, K, TRegistry>
  ? ProviderNativeRegistry<V, K, TRegistry>[P]
  : Record<never, never>;

/** Fluent-client native door narrowed to the selected implemented provider. */
export type ProviderClientNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, "client", TRegistry>;

/** Repository-container native door narrowed to the selected implemented provider. */
export type ProviderRepositoryContainerNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, "repositoryContainer", TRegistry>;

/** Repository native door narrowed to the selected implemented provider. */
export type ProviderRepositoryNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, "repository", TRegistry>;

/** Core entity native door narrowed to the selected provider, version, and entity kind. */
export type ProviderEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TKind extends ProviderCoreEntityNativeKind,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, TKind, TRegistry>;

/** Optional SHA-addressed blob native door. */
export type ProviderBlobNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, "blob", TRegistry>;

/** Optional branch-rule native door narrowed by normalized entity kind. */
export type ProviderBranchRuleEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TKind extends ProviderBranchRuleEntityNativeKind,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, TKind, TRegistry>;

/** Optional CI discovery native door narrowed by normalized entity kind. */
export type ProviderCiEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TKind extends ProviderCiEntityNativeKind,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, TKind, TRegistry>;

/** Optional authenticated-user-profile native door. */
export type ProviderCurrentUserProfileNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, "currentUserProfile", TRegistry>;

/** Optional issue native door narrowed by normalized entity kind. */
export type ProviderIssueEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TKind extends ProviderIssueEntityNativeKind,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, TKind, TRegistry>;

/** Optional package native door narrowed by normalized entity kind. */
export type ProviderPackageEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TKind extends ProviderPackageEntityNativeKind,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, TKind, TRegistry>;

/** Optional submitted pull-request review native door. */
export type ProviderPullRequestReviewNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, "pullRequestReview", TRegistry>;

/** Optional release native door narrowed by normalized entity kind. */
export type ProviderReleaseEntityNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TKind extends ProviderReleaseEntityNativeKind,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, TKind, TRegistry>;

/** Optional repository-webhook native door. */
export type ProviderRepositoryWebhookNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = RegisteredProviderNative<TProvider, TVersion, "repositoryWebhook", TRegistry>;
