import type { Provider, ProviderTypeRegistry, ProviderVersion } from "./provider.ts";
import type { ProviderExtensionOptions } from "../provider-extensions/ProviderExtensionRegistry.ts";

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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
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
  readonly native: ProviderEntityNative<TProvider, TVersion, "pullRequest", TRegistry>;
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

export type MergePullRequestExtension<
  TProvider extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ProviderExtensionOptions<
  "pullRequests.merge",
  TProvider,
  TRegistry
>;

export interface MergePullRequestOptions<
  TProvider extends Provider = Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends OperationOptions, MergePullRequestInput {
  readonly extension?: MergePullRequestExtension<TProvider, TRegistry>;
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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  listPullRequests(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    request: ListPullRequestsRequest,
  ): Promise<Page<PullRequestData<TProvider, TVersion, TRegistry>>>;
  getPullRequest(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    number: number,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion, TRegistry>>;
  findPullRequest(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    input: FindPullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion, TRegistry> | undefined>;
  isPullRequestMerged(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    refresh: boolean,
    options?: OperationOptions,
  ): Promise<boolean>;
  listPullRequestCommits(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    request: ResolvedPageRequest,
  ): Promise<Page<CommitData<TProvider, TVersion, TRegistry>>>;
  listPullRequestFiles(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    request: ResolvedPageRequest,
  ): Promise<Page<CommitFileData>>;
  createPullRequest(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    input: CreatePullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion, TRegistry>>;
  updatePullRequest(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    input: UpdatePullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion, TRegistry>>;
  closePullRequest(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<PullRequestData<TProvider, TVersion, TRegistry>>;
  mergePullRequest(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    options?: MergePullRequestOptions<TProvider, TRegistry>,
  ): Promise<PullRequestData<TProvider, TVersion, TRegistry>>;
  requestPullRequestReviewers(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    reviewers: readonly string[],
    options?: OperationOptions,
  ): Promise<void>;
  approvePullRequest(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    body?: string,
    options?: OperationOptions,
  ): Promise<void>;
  publishPullRequestComment(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    pullRequest: PullRequestData<TProvider, TVersion, TRegistry>,
    input: PullRequestCommentInput,
    options?: OperationOptions,
  ): Promise<void>;
}
