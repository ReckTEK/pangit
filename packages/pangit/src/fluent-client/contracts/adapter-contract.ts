import type * as Contract from "../../fluent-api/mod.ts";
import type { FluentProviderTypes } from "../provider-types.ts";

/** One provider's complete implementation of the universal fluent Git-host contract. */
export type GitHostAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.GitHostAdapter<TProvider, TVersion, FluentProviderTypes>;

export type BasicAuthorizationOptions<P extends Contract.Provider> =
  Contract.BasicAuthorizationOptions<P, FluentProviderTypes>;

export type AuthenticationAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
  TAuthorizedAdapter,
> = Contract.AuthenticationAdapter<TProvider, TVersion, TAuthorizedAdapter, FluentProviderTypes>;

export type BranchData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BranchData<TProvider, TVersion, FluentProviderTypes>;

export type BranchDivergenceData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BranchDivergenceData<TProvider, TVersion, FluentProviderTypes>;

export type BranchAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BranchAdapter<TProvider, TVersion, FluentProviderTypes>;

export type CommitStatusData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CommitStatusData<TProvider, TVersion, FluentProviderTypes>;

export type CombinedCommitStatus<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CombinedCommitStatus<TProvider, TVersion, FluentProviderTypes>;

export type SetCommitStatusExtension<TProvider extends Contract.Provider> =
  Contract.SetCommitStatusExtension<TProvider, FluentProviderTypes>;

export type SetCommitStatusOptions<TProvider extends Contract.Provider = Contract.Provider> =
  Contract.SetCommitStatusOptions<TProvider, FluentProviderTypes>;

export type CommitStatusAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CommitStatusAdapter<TProvider, TVersion, FluentProviderTypes>;

export type CommitData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CommitData<TProvider, TVersion, FluentProviderTypes>;

export type CompareCommitsExtension<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CompareCommitsExtension<TProvider, TVersion, FluentProviderTypes>;

export type CompareCommitsOptions<
  TProvider extends Contract.Provider = Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes> =
    Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CompareCommitsOptions<TProvider, TVersion, FluentProviderTypes>;

export type CommitComparison<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CommitComparison<TProvider, TVersion, FluentProviderTypes>;

export type MergeBasesResult<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.MergeBasesResult<TProvider, TVersion, FluentProviderTypes>;

export type CommitAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CommitAdapter<TProvider, TVersion, FluentProviderTypes>;

export type ContentData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ContentData<TProvider, TVersion, FluentProviderTypes>;

export type ContentReadResult<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ContentReadResult<TProvider, TVersion, FluentProviderTypes>;

export type CommitFileChangesExtension<TProvider extends Contract.Provider> =
  Contract.CommitFileChangesExtension<TProvider, FluentProviderTypes>;

export type CommitFileChangesOptions<TProvider extends Contract.Provider = Contract.Provider> =
  Contract.CommitFileChangesOptions<TProvider, FluentProviderTypes>;

export type ContentAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ContentAdapter<TProvider, TVersion, FluentProviderTypes>;

export type CreateForkOptions<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CreateForkOptions<TProvider, TVersion, FluentProviderTypes>;

export type ForkAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ForkAdapter<TProvider, TVersion, FluentProviderTypes>;

export type ProviderVersion<P extends Contract.Provider> = Contract.ProviderVersion<
  P,
  FluentProviderTypes
>;

export type FluentProviderVersion<P extends Contract.Provider> = Contract.FluentProviderVersion<
  P,
  FluentProviderTypes
>;

export type PullRequestData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PullRequestData<TProvider, TVersion, FluentProviderTypes>;

export type MergePullRequestExtension<TProvider extends Contract.Provider> =
  Contract.MergePullRequestExtension<TProvider, FluentProviderTypes>;

export type MergePullRequestOptions<TProvider extends Contract.Provider = Contract.Provider> =
  Contract.MergePullRequestOptions<TProvider, FluentProviderTypes>;

export type PullRequestAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PullRequestAdapter<TProvider, TVersion, FluentProviderTypes>;

/** Provider-normalized repository-owning container data. */
export type RepositoryContainerData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryContainerData<TProvider, TVersion, FluentProviderTypes>;

/** Provider-normalized repository data. */
export type RepositoryData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryData<TProvider, TVersion, FluentProviderTypes>;

/** Repository-container discovery and repository lifecycle adapter operations. */
export type RepositoryAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryAdapter<TProvider, TVersion, FluentProviderTypes>;

export type TagData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.TagData<TProvider, TVersion, FluentProviderTypes>;

export type TagAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.TagAdapter<TProvider, TVersion, FluentProviderTypes>;

/** Provider-neutral result of reading one Git blob by object ID. */
export type BlobData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BlobData<TProvider, TVersion, FluentProviderTypes>;

/** Optional, direct SHA-addressed blob-read contract. */
export type BlobReadAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BlobReadAdapter<TProvider, TVersion, FluentProviderTypes>;

/** Configured rule values whose meaning is shared across provider implementations. */
export type BranchRuleData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BranchRuleData<TProvider, TVersion, FluentProviderTypes>;

/** Effective enforcement resolved by the provider for one concrete branch. */
export type EffectiveBranchProtectionData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.EffectiveBranchProtectionData<TProvider, TVersion, FluentProviderTypes>;

export type BranchRuleOrderExtension<TProvider extends Contract.Provider> =
  Contract.BranchRuleOrderExtension<TProvider, FluentProviderTypes>;

export type BranchRuleOrderOptions<TProvider extends Contract.Provider> =
  Contract.BranchRuleOrderOptions<TProvider, FluentProviderTypes>;

/** Optional configured-rule and effective-enforcement adapter contracts. */
export type BranchRuleAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BranchRuleAdapter<TProvider, TVersion, FluentProviderTypes>;

export type CiWorkflowData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiWorkflowData<TProvider, TVersion, FluentProviderTypes>;

export type CiRunData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiRunData<TProvider, TVersion, FluentProviderTypes>;

export type CiJobData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiJobData<TProvider, TVersion, FluentProviderTypes>;

export type CiArtifactData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiArtifactData<TProvider, TVersion, FluentProviderTypes>;

/** Optional read-only workflow/run/job/artifact discovery contract. */
export type CiRunDiscoveryAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CiRunDiscoveryAdapter<TProvider, TVersion, FluentProviderTypes>;

/** Provider-neutral authenticated-user identity. */
export type CurrentUserProfileData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CurrentUserProfileData<TProvider, TVersion, FluentProviderTypes>;

export type CurrentUserProfileAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CurrentUserProfileAdapter<TProvider, TVersion, FluentProviderTypes>;

export type IssueData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.IssueData<TProvider, TVersion, FluentProviderTypes>;

export type IssueCommentData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.IssueCommentData<TProvider, TVersion, FluentProviderTypes>;

export type IssueUpdateExtension<TProvider extends Contract.Provider> =
  Contract.IssueUpdateExtension<TProvider, FluentProviderTypes>;

export type IssueUpdateOptions<TProvider extends Contract.Provider> = Contract.IssueUpdateOptions<
  TProvider,
  FluentProviderTypes
>;

/** Optional shared issue capability implemented by a provider adapter. */
export type IssueAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.IssueAdapter<TProvider, TVersion, FluentProviderTypes>;

export type PackageVersionData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PackageVersionData<TProvider, TVersion, FluentProviderTypes>;

export type PackageFileData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PackageFileData<TProvider, TVersion, FluentProviderTypes>;

/** Optional package metadata and destructive lifecycle contract. */
export type PackageAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PackageAdapter<TProvider, TVersion, FluentProviderTypes>;

/** One provider-normalized pull-request review object. */
export type PullRequestReviewData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PullRequestReviewData<TProvider, TVersion, FluentProviderTypes>;

export type CreatePullRequestReviewExtension<TProvider extends Contract.Provider> =
  Contract.CreatePullRequestReviewExtension<TProvider, FluentProviderTypes>;

export type CreatePullRequestReviewOptions<
  TProvider extends Contract.Provider = Contract.Provider,
> = Contract.CreatePullRequestReviewOptions<TProvider, FluentProviderTypes>;

/** Optional submitted-review-object lifecycle, separate from core reviewer actions. */
export type PullRequestReviewAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PullRequestReviewAdapter<TProvider, TVersion, FluentProviderTypes>;

export type ReleaseData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ReleaseData<TProvider, TVersion, FluentProviderTypes>;

export type ReleaseAssetData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ReleaseAssetData<TProvider, TVersion, FluentProviderTypes>;

/** Optional shared releases and release-assets capability implemented by a provider adapter. */
export type ReleaseAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ReleaseAdapter<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryWebhookData<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryWebhookData<TProvider, TVersion, FluentProviderTypes>;

/** Optional shared repository-webhook adapter contract. */
export type RepositoryWebhookAdapter<
  TProvider extends Contract.Provider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryWebhookAdapter<TProvider, TVersion, FluentProviderTypes>;
