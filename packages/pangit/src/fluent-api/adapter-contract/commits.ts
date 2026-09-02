import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { BoundedOperationOptions, OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest, ScanPage } from "./pagination.ts";
import type { RepositoryData } from "./repositories.ts";

export interface GitActor {
  readonly name?: string;
  readonly email?: string;
  readonly date?: string;
}

export interface CommitFileData {
  readonly path: string;
  readonly previousPath?: string;
  readonly status?: string;
  readonly additions?: number;
  readonly deletions?: number;
  readonly changes?: number;
}

export interface CommitData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly sha: string;
  readonly message: string;
  readonly url?: string;
  readonly author?: GitActor;
  readonly committer?: GitActor;
  readonly parents: readonly string[];
  readonly files?: readonly CommitFileData[];
  readonly additions?: number;
  readonly deletions?: number;
  readonly changedFiles?: number;
  readonly verified?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "commit">;
}

export interface CommitFacets {
  readonly files?: boolean;
  readonly stats?: boolean;
  readonly verification?: boolean;
}

export interface ListCommitsRequest extends ResolvedPageRequest, CommitFacets {
  readonly ref?: string;
  readonly since?: string;
  readonly until?: string;
  readonly excluding?: string;
}

export interface GetCommitOptions extends OperationOptions, CommitFacets {}

export interface GetCommitsOptions extends BoundedOperationOptions, CommitFacets {}

/** Default caller-visible ceiling for a multi-SHA get. */
export const DEFAULT_COMMIT_MULTI_GET_MAX_ITEMS = 100;
/** Provider work for commit multi-reads is never fanned out beyond this common ceiling. */
export const MAX_COMMIT_READ_CONCURRENCY = 4;

/** Gitea 1.27.2 raw comparison representation selected by the provider extension. */
export type GiteaCommitComparisonOutputFormat = "diff" | "patch";

/** Provider-only selector for the raw comparison representation. */
export interface GiteaCompareCommitsExtension {
  readonly output: GiteaCommitComparisonOutputFormat;
}

/** Safe operation context passed to the Gitea comparison extension callback. */
export interface GiteaCompareCommitsExtensionContext {
  readonly repositoryFullName: string;
  readonly base: string;
  readonly head: string;
}

/** Complete raw comparison returned by Gitea without parsing or truncation. */
export interface GiteaCommitComparisonOutput {
  readonly output: GiteaCommitComparisonOutputFormat;
  readonly content: string;
}

export type CompareCommitsExtension<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = TProvider extends "gitea" ? TVersion extends "1.27.2" ? GiteaCompareCommitsExtension : never
  : never;

export interface CompareCommitsOptions<
  TProvider extends Provider = Provider,
  TVersion extends ProviderVersion<TProvider> = ProviderVersion<TProvider>,
> extends OperationOptions {
  readonly extension?: CompareCommitsExtension<TProvider, TVersion>;
}

export interface CommitComparison<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly commits: readonly CommitData<TProvider, TVersion>[];
  readonly totalCommits?: number;
}

export interface MergeBasesResult<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly commits: readonly CommitData<TProvider, TVersion>[];
  readonly complete: true;
}

/** Merge-base fallback must always have an explicit total commit-inspection ceiling. */
export interface MergeBaseOptions extends OperationOptions {
  readonly maxItems: number;
  readonly maxRequests: number;
  readonly concurrency?: number;
}

export type CommitRefKind = "branch" | "tag";
export type CommitRefMatch = "head" | "contains";

export interface CommitRefData {
  readonly kind: CommitRefKind;
  readonly name: string;
  readonly sha: string;
}

export interface FindCommitRefsRequest extends ResolvedPageRequest, BoundedOperationOptions {
  readonly kinds: readonly CommitRefKind[];
  readonly match: CommitRefMatch;
  /** Required when `match` is `contains`; bounds provider work for each candidate ref. */
  readonly maxCommitsPerRef?: number;
}

export interface ContributorData {
  readonly name?: string;
  readonly email?: string;
  readonly commits: number;
}

/**
 * At least one of `maxItems`, `since`, or `until` is required. Each result aggregates only the
 * returned history slice; `complete` states whether that slice reached the end of history.
 */
export interface ListContributorsRequest extends ResolvedPageRequest, BoundedOperationOptions {
  readonly ref?: string;
  readonly since?: string;
  readonly until?: string;
}

export interface CommitAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  listCommits(
    repository: RepositoryData<TProvider, TVersion>,
    request: ListCommitsRequest,
  ): Promise<Page<CommitData<TProvider, TVersion>>>;
  getCommit(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    options?: GetCommitOptions,
  ): Promise<CommitData<TProvider, TVersion>>;
  getCommits(
    repository: RepositoryData<TProvider, TVersion>,
    shas: readonly string[],
    options?: GetCommitsOptions,
  ): Promise<readonly CommitData<TProvider, TVersion>[]>;
  compareCommits(
    repository: RepositoryData<TProvider, TVersion>,
    base: string,
    head: string,
    options?: CompareCommitsOptions<TProvider, TVersion>,
  ): Promise<CommitComparison<TProvider, TVersion> | GiteaCommitComparisonOutput>;
  listCommitFiles(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    options?: OperationOptions,
  ): Promise<readonly CommitFileData[]>;
  findMergeBases(
    repository: RepositoryData<TProvider, TVersion>,
    left: string,
    right: string,
    options: MergeBaseOptions,
  ): Promise<MergeBasesResult<TProvider, TVersion>>;
  countReachableCommits(
    repository: RepositoryData<TProvider, TVersion>,
    include: string,
    exclude?: string,
    options?: OperationOptions,
  ): Promise<number>;
  findRefsForCommit(
    repository: RepositoryData<TProvider, TVersion>,
    sha: string,
    request: FindCommitRefsRequest,
  ): Promise<Page<CommitRefData>>;
  listContributors(
    repository: RepositoryData<TProvider, TVersion>,
    request: ListContributorsRequest,
  ): Promise<ScanPage<ContributorData>>;
}
