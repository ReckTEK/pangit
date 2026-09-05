import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { CommitData, CommitFileData } from "./commits.ts";
import type { OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest } from "./pagination.ts";
import type { RepositoryData } from "./repositories.ts";

export type PullRequestState = "open" | "closed";

export interface PullRequestRef {
  readonly owner: string;
  readonly repository: string;
  readonly branch: string;
  readonly sha?: string;
}

export interface PullRequestData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  readonly description?: string;
  readonly state: PullRequestState;
  readonly source: PullRequestRef;
  readonly target: PullRequestRef;
  readonly author?: string;
  readonly merged: boolean;
  readonly mergeable?: boolean;
  readonly mergeBaseSha?: string;
  readonly mergeCommitSha?: string;
  readonly url?: string;
  readonly native: ProviderEntityNative<TProvider, TVersion, "pullRequest">;
}

export interface ListPullRequestsRequest extends ResolvedPageRequest {
  readonly state?: PullRequestState | "all";
  readonly base?: string;
  readonly head?: string;
  readonly author?: string;
  /**
   * Provider text search. Adapters may hydrate each match from the single bounded provider page,
   * so request cost is at most one search plus `limit` direct reads at bounded concurrency.
   */
  readonly query?: string;
}

/** Portable ceiling for concurrent direct hydrations after a bounded PR text-search page. */
export const MAX_PULL_REQUEST_SEARCH_HYDRATION_CONCURRENCY = 4;

export interface FindPullRequestInput {
  readonly base: string;
  readonly head: string;
}

export interface CreatePullRequestInput {
  readonly title: string;
  readonly description?: string;
  readonly source: PullRequestRef;
  readonly targetBranch: string;
}

export interface UpdatePullRequestInput {
  readonly title?: string;
  readonly description?: string;
  readonly targetBranch?: string;
}

export type PullRequestMergeMethod = "provider-default" | "squash";

export interface MergePullRequestInput {
  readonly method?: PullRequestMergeMethod;
  readonly deleteSourceBranch?: boolean;
}

export type GiteaPullRequestMergeMethod =
  | "fast-forward-only"
  | "manually-merged"
  | "merge"
  | "rebase"
  | "rebase-merge"
  | "squash";

/** Exact Gitea merge controls that are deliberately excluded from the portable merge input. */
export interface GiteaMergePullRequestExtension {
  readonly method?: GiteaPullRequestMergeMethod;
  readonly forceMerge?: boolean;
  readonly headCommitId?: string;
  readonly mergeCommitId?: string;
  readonly mergeMessage?: string;
  readonly mergeTitle?: string;
  readonly mergeWhenChecksSucceed?: boolean;
  /** Required polling bound when `mergeWhenChecksSucceed` schedules asynchronous completion. */
  readonly scheduledCompletion?: {
    readonly attempts: number;
    readonly intervalMs?: number;
  };
}

export interface GiteaMergePullRequestExtensionContext {
  readonly repositoryFullName: string;
  readonly pullRequestNumber: number;
  readonly sourceSha?: string;
}

/** GitLab synchronous merge controls, including an explicit optimistic head guard. */
export interface GitLabMergePullRequestExtension {
  readonly headCommitId?: string;
  readonly mergeMessage?: string;
  readonly squashMessage?: string;
}
export type GitLabMergePullRequestExtensionContext = GiteaMergePullRequestExtensionContext;

export type MergePullRequestExtension<TProvider extends Provider> = TProvider extends "gitea"
  ? GiteaMergePullRequestExtension
  : TProvider extends "gitlab" ? GitLabMergePullRequestExtension
  : never;

export interface MergePullRequestOptions<TProvider extends Provider = Provider>
  extends OperationOptions, MergePullRequestInput {
  readonly extension?: MergePullRequestExtension<TProvider>;
}

export interface PullRequestCommentInput {
  readonly body: string;
  readonly position?: {
    readonly path: string;
    readonly side: "old" | "new";
    readonly line: number;
  };
}

export interface PullRequestAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  listPullRequests(
    repository: RepositoryData<TProvider, TVersion>,
    request: ListPullRequestsRequest,
  ): Promise<Page<PullRequestData<TProvider, TVersion>>>;
  getPullRequest(
    repository: RepositoryData<TProvider, TVersion>,
    number: number,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion>>;
  findPullRequest(
    repository: RepositoryData<TProvider, TVersion>,
    input: FindPullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion> | undefined>;
  isPullRequestMerged(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    refresh: boolean,
    options?: OperationOptions,
  ): Promise<boolean>;
  listPullRequestCommits(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    request: ResolvedPageRequest,
  ): Promise<Page<CommitData<TProvider, TVersion>>>;
  listPullRequestFiles(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    request: ResolvedPageRequest,
  ): Promise<Page<CommitFileData>>;
  createPullRequest(
    repository: RepositoryData<TProvider, TVersion>,
    input: CreatePullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion>>;
  updatePullRequest(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    input: UpdatePullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion>>;
  closePullRequest(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion>>;
  mergePullRequest(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    options?: MergePullRequestOptions<TProvider>,
  ): Promise<PullRequestData<TProvider, TVersion>>;
  requestPullRequestReviewers(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    reviewers: readonly string[],
    options?: OperationOptions,
  ): Promise<void>;
  approvePullRequest(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    body?: string,
    options?: OperationOptions,
  ): Promise<void>;
  publishPullRequestComment(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    input: PullRequestCommentInput,
    options?: OperationOptions,
  ): Promise<void>;
}
