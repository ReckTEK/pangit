import type * as Contract from "../../fluent-api/mod.ts";
import type { FluentProviderTypes } from "../provider-types.ts";

export type BranchDivergenceResult<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BranchDivergenceResult<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryBranches<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryBranches<TProvider, TVersion, FluentProviderTypes>;

export type SetCommitStatusOperation<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.SetCommitStatusOperation<TProvider, TVersion, FluentProviderTypes>;

export type CombinedStatus<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CombinedStatus<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryCommitStatuses<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryCommitStatuses<TProvider, TVersion, FluentProviderTypes>;

export type CommitComparisonResult<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CommitComparisonResult<TProvider, TVersion, FluentProviderTypes>;

export type MergeBases<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.MergeBases<TProvider, TVersion, FluentProviderTypes>;

export type CompareCommitsOperation<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CompareCommitsOperation<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryCommits<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryCommits<TProvider, TVersion, FluentProviderTypes>;

export type CommitFileChangesOperation<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CommitFileChangesOperation<TProvider, TVersion, FluentProviderTypes>;

export type ContentRead<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.ContentRead<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryContent<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryContent<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryForks<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryForks<TProvider, TVersion, FluentProviderTypes>;

export type MergePullRequestOperation<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.MergePullRequestOperation<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryPullRequests<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryPullRequests<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryTags<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryTags<TProvider, TVersion, FluentProviderTypes>;

export type CurrentUserProfileCapability<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CurrentUserProfileCapability<TProvider, TVersion, FluentProviderTypes>;

export type Packages<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.Packages<TProvider, TVersion, FluentProviderTypes>;

export type CreatePullRequestReviewOperation<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.CreatePullRequestReviewOperation<TProvider, TVersion, FluentProviderTypes>;

export type PullRequestReviews<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.PullRequestReviews<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryBlobs<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryBlobs<TProvider, TVersion, FluentProviderTypes>;

export type BranchRuleOrderOperation<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.BranchRuleOrderOperation<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryBranchRules<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryBranchRules<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryCiRunDiscovery<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryCiRunDiscovery<TProvider, TVersion, FluentProviderTypes>;

export type IssueUpdateOperation<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.IssueUpdateOperation<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryIssues<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryIssues<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryReleases<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryReleases<TProvider, TVersion, FluentProviderTypes>;

export type RepositoryWebhooks<
  TProvider extends Contract.FluentProvider,
  TVersion extends Contract.ProviderVersion<TProvider, FluentProviderTypes>,
> = Contract.RepositoryWebhooks<TProvider, TVersion, FluentProviderTypes>;
