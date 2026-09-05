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
