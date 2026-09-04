/** Git-host-neutral fluent API. @module */

export { createClient } from "./FluentClient.ts";
export type { AuthorizedClient, FluentClient, FluentClientOptions } from "./FluentClient.ts";
export type { RepositoryContainer } from "./entities/RepositoryContainer.ts";
export type {
  CreateRepositoryOptions,
  InitialRepositoryFile,
  RepositoryContainerKind,
  RepositoryParentData,
} from "./adapter-contract/repositories.ts";
export type { Page, PageRequest, ScanPage } from "./adapter-contract/pagination.ts";
export type { OperationOptions } from "./adapter-contract/operation-options.ts";
export type { Repository } from "./entities/Repository.ts";
export type { Branch } from "./entities/Branch.ts";
export type { Tag } from "./entities/Tag.ts";
export type { Commit } from "./entities/Commit.ts";
export type { Content } from "./entities/Content.ts";
export type {
  ContentBlobOptions,
  ContentReadFailure,
  ProviderMediaType,
  ReadableContentBody,
} from "./adapter-contract/content-body.ts";
export type { PullRequest } from "./entities/PullRequest.ts";
export type { CommitStatus } from "./entities/CommitStatus.ts";
export type { BranchDivergence, CreateBranchInput } from "./adapter-contract/branches.ts";
export type {
  CommitFacets,
  CommitFileData,
  CommitRefKind,
  CommitRefMatch,
  CompareCommitsOptions,
  ContributorData,
  GetCommitOptions,
  GetCommitsOptions,
  GitActor,
  GiteaCommitComparisonOutput,
  GiteaCommitComparisonOutputFormat,
  GiteaCompareCommitsExtension,
  GiteaCompareCommitsExtensionContext,
  MergeBaseOptions,
} from "./adapter-contract/commits.ts";
export type {
  CommitFileChangesInput,
  FileChange,
  GiteaCommitFileChangesExtension,
  GiteaCommitFileChangesExtensionContext,
  ListDirectoryOptions,
  ReadContentBlobOptions,
  ReadContentOptions,
  ReadFileOptions,
  ReadFilesOptions,
  ReadLinkedContentOptions,
  ReadPathMetadataBatchOptions,
  RepositoryContentKind,
} from "./adapter-contract/content.ts";
export type { CreateForkOptions } from "./adapter-contract/forks.ts";
export type {
  CreatePullRequestInput,
  FindPullRequestInput,
  GiteaMergePullRequestExtension,
  GiteaMergePullRequestExtensionContext,
  GiteaPullRequestMergeMethod,
  MergePullRequestInput,
  PullRequestCommentInput,
  PullRequestMergeMethod,
  PullRequestRef,
  PullRequestState,
  UpdatePullRequestInput,
} from "./adapter-contract/pull-requests.ts";
export type { CreateTagInput } from "./adapter-contract/tags.ts";
export type {
  CommitStatusReference,
  CommitStatusState,
  GiteaCommitStatusExtensionState,
  GiteaSetCommitStatusExtension,
  GiteaSetCommitStatusExtensionContext,
  SetCommitStatusInput,
} from "./adapter-contract/commit-statuses.ts";
export type {
  BranchDivergenceResult,
  ListBranchDivergencesOptions,
  ListBranchesOptions,
  RepositoryBranches,
} from "./capabilities/RepositoryBranches.ts";
export type {
  CommitComparisonResult,
  CompareCommitsOperation,
  FindCommitRefsOptions,
  ListCommitsOptions,
  ListContributorsOptions,
  MergeBases,
  RepositoryCommits,
} from "./capabilities/RepositoryCommits.ts";
export type {
  CommitFileChangesOperation,
  ContentRead,
  RepositoryContent,
} from "./capabilities/RepositoryContent.ts";
export type { RepositoryForks } from "./capabilities/RepositoryForks.ts";
export type {
  ListPullRequestsOptions,
  MergePullRequestOperation,
  RepositoryPullRequests,
} from "./capabilities/RepositoryPullRequests.ts";
export type { RepositoryTags } from "./capabilities/RepositoryTags.ts";
export type {
  CombinedStatus,
  RepositoryCommitStatuses,
  SetCommitStatusOperation,
} from "./capabilities/RepositoryCommitStatuses.ts";
export type { Blob } from "./entities/optional/Blob.ts";
export type { BranchRule, EffectiveBranchProtection } from "./entities/optional/BranchRule.ts";
export type { CurrentUserProfile } from "./entities/optional/CurrentUserProfile.ts";
export type { Issue, IssueComment } from "./entities/optional/Issue.ts";
export type { PackageFile, PackageVersion } from "./entities/optional/Package.ts";
export type { Release, ReleaseAsset } from "./entities/optional/Release.ts";
export type { PullRequestReview } from "./entities/optional/PullRequestReview.ts";
export type { RepositoryWebhook } from "./entities/optional/RepositoryWebhook.ts";
export type { CiArtifact, CiJob, CiRun, CiWorkflow } from "./entities/optional/CiRunDiscovery.ts";
export type { CurrentUserProfileCapability } from "./capabilities/optional/CurrentUserProfile.ts";
export type { ListPackagesOptions, Packages } from "./capabilities/optional/Packages.ts";
export type { RepositoryBlobs } from "./capabilities/optional/RepositoryBlobs.ts";
export type {
  BranchRuleOrderOperation,
  RepositoryBranchRules,
} from "./capabilities/optional/RepositoryBranchRules.ts";
export type {
  IssueUpdateOperation,
  ListIssuesOptions,
  RepositoryIssues,
} from "./capabilities/optional/RepositoryIssues.ts";
export type { RepositoryReleases } from "./capabilities/optional/RepositoryReleases.ts";
export type {
  CreatePullRequestReviewOperation,
  PullRequestReviews,
} from "./capabilities/optional/PullRequestReviews.ts";
export type { RepositoryWebhooks } from "./capabilities/optional/RepositoryWebhooks.ts";
export type {
  ListCiJobsOptions,
  ListCiRunsOptions,
  RepositoryCiRunDiscovery,
} from "./capabilities/optional/RepositoryCiRunDiscovery.ts";
export type {
  UnsupportedOptionalCapabilities,
} from "./capabilities/optional/UnsupportedOptionalCapabilities.ts";
export type {
  BlobReadCapabilitySupport,
  ReadGitBlobOptions,
} from "./adapter-contract/optional/blob-reads.ts";
export type {
  BranchRuleCapabilitySupport,
  BranchRuleFields,
  BranchRuleOperation,
  CreateBranchRuleInput,
  GiteaBranchRuleOrderExtension,
  GiteaBranchRuleOrderExtensionContext,
  ListBranchRulesOptions,
  UpdateBranchRuleInput,
} from "./adapter-contract/optional/branch-rules.ts";
export type {
  CurrentUserProfileCapabilitySupport,
} from "./adapter-contract/optional/current-user-profile.ts";
export type {
  CreateIssueInput,
  GiteaIssueUpdateExtension,
  GiteaIssueUpdateExtensionContext,
  IssueCapabilityOperation,
  IssueCapabilitySupport,
  IssueCommentInput,
  IssueState,
  UpdateIssueInput,
} from "./adapter-contract/optional/issues.ts";
export type {
  ListPackageFilesOptions,
  PackageCapabilityOperation,
  PackageCapabilitySupport,
  PackageCoordinates,
  PackageFileDigests,
  PackageVersionIdentity,
} from "./adapter-contract/optional/packages.ts";
export type {
  CreatePullRequestReviewInput,
  GiteaCreatePullRequestReviewExtension,
  GiteaCreatePullRequestReviewExtensionContext,
  GiteaPullRequestReviewComment,
  GiteaPullRequestReviewEvent,
  PullRequestReviewCapabilitySupport,
  PullRequestReviewOperation,
  PullRequestReviewState,
  SubmitPullRequestReviewEvent,
  SubmitPullRequestReviewInput,
} from "./adapter-contract/optional/pull-request-reviews.ts";
export type {
  CreateReleaseInput,
  ListReleaseAssetsOptions,
  ReleaseCapabilityOperation,
  ReleaseCapabilitySupport,
  UpdateReleaseAssetInput,
  UpdateReleaseInput,
  UploadReleaseAssetInput,
} from "./adapter-contract/optional/releases.ts";
export type {
  CreateRepositoryWebhookInput,
  RepositoryWebhookCapabilitySupport,
  RepositoryWebhookContentType,
  RepositoryWebhookEvent,
  RepositoryWebhookOperation,
  UpdateRepositoryWebhookInput,
} from "./adapter-contract/optional/repository-webhooks.ts";
export type {
  ExplicitlyUnsupportedOptionalCapability,
  UnsupportedOptionalCapabilityMap,
  UnsupportedOptionalCapabilityMetadata,
} from "./adapter-contract/optional/unsupported-capabilities.ts";
export type {
  CiExecutionConclusion,
  CiExecutionFilterStatus,
  CiExecutionStatus,
  CiRunDiscoveryCapabilitySupport,
  CiRunDiscoveryOperation,
  CiWorkflowState,
} from "./adapter-contract/optional/ci-run-discovery.ts";
export type {
  ExecutableOperation,
  OperationExtension,
} from "./provider-extensions/OperationExtension.ts";
export type {
  ProviderExtensionContext,
  ProviderExtensionDefinition,
  ProviderExtensionOptions,
  ProviderExtensionRegistry,
  ProviderExtensionResult,
  ProviderExtensionSupportedVersion,
  ProviderExtensionSupportsVersion,
  RegisteredOperation,
  RegisteredProvider,
} from "./provider-extensions/ProviderExtensionRegistry.ts";
export type { FluentProvider, FluentProviderVersion } from "./provider-registry.ts";
export type { ProviderVersion } from "../generated-rest-clients/git-host.ts";
export * as auth from "./auth/mod.ts";
export * as errors from "./adapter-contract/errors.ts";
