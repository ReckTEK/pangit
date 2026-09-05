import type * as Contract from "../../fluent-api/mod.ts";
import type { FluentProviderTypes } from "../provider-types.ts";

/** Provider-owned native families selected from the explicit type composition. */
export type ProviderNativeRegistry<V extends string, K extends Contract.ProviderNativeKind> =
  Contract.ProviderNativeRegistry<V, K, FluentProviderTypes>;

/** Fluent-client native door narrowed to the selected implemented provider. */
export type ProviderClientNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ProviderClientNative<TProvider, TVersion, FluentProviderTypes>;

/** Repository-container native door narrowed to the selected implemented provider. */
export type ProviderRepositoryContainerNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ProviderRepositoryContainerNative<TProvider, TVersion, FluentProviderTypes>;

/** Repository native door narrowed to the selected implemented provider. */
export type ProviderRepositoryNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ProviderRepositoryNative<TProvider, TVersion, FluentProviderTypes>;

/** Core entity native door narrowed to the selected provider, version, and entity kind. */
export type ProviderEntityNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
  TKind extends Contract.ProviderCoreEntityNativeKind,
> = Contract.ProviderEntityNative<TProvider, TVersion, TKind, FluentProviderTypes>;

/** Optional SHA-addressed blob native door. */
export type ProviderBlobNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ProviderBlobNative<TProvider, TVersion, FluentProviderTypes>;

/** Optional branch-rule native door narrowed by normalized entity kind. */
export type ProviderBranchRuleEntityNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
  TKind extends Contract.ProviderBranchRuleEntityNativeKind,
> = Contract.ProviderBranchRuleEntityNative<TProvider, TVersion, TKind, FluentProviderTypes>;

/** Optional CI discovery native door narrowed by normalized entity kind. */
export type ProviderCiEntityNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
  TKind extends Contract.ProviderCiEntityNativeKind,
> = Contract.ProviderCiEntityNative<TProvider, TVersion, TKind, FluentProviderTypes>;

/** Optional authenticated-user-profile native door. */
export type ProviderCurrentUserProfileNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ProviderCurrentUserProfileNative<TProvider, TVersion, FluentProviderTypes>;

/** Optional issue native door narrowed by normalized entity kind. */
export type ProviderIssueEntityNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
  TKind extends Contract.ProviderIssueEntityNativeKind,
> = Contract.ProviderIssueEntityNative<TProvider, TVersion, TKind, FluentProviderTypes>;

/** Optional package native door narrowed by normalized entity kind. */
export type ProviderPackageEntityNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
  TKind extends Contract.ProviderPackageEntityNativeKind,
> = Contract.ProviderPackageEntityNative<TProvider, TVersion, TKind, FluentProviderTypes>;

/** Optional submitted pull-request review native door. */
export type ProviderPullRequestReviewNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ProviderPullRequestReviewNative<TProvider, TVersion, FluentProviderTypes>;

/** Optional release native door narrowed by normalized entity kind. */
export type ProviderReleaseEntityNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
  TKind extends Contract.ProviderReleaseEntityNativeKind,
> = Contract.ProviderReleaseEntityNative<TProvider, TVersion, TKind, FluentProviderTypes>;

/** Optional repository-webhook native door. */
export type ProviderRepositoryWebhookNative<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ProviderRepositoryWebhookNative<TProvider, TVersion, FluentProviderTypes>;
