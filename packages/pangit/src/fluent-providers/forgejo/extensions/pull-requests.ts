export type ForgejoPullRequestMergeMethod =
  | "fast-forward-only"
  | "manually-merged"
  | "merge"
  | "rebase"
  | "rebase-merge"
  | "squash";

/** Exact Forgejo merge controls that are deliberately excluded from the portable merge input. */
export interface ForgejoMergePullRequestExtension {
  readonly method?: ForgejoPullRequestMergeMethod;
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

export interface ForgejoMergePullRequestExtensionContext {
  readonly repositoryFullName: string;
  readonly pullRequestNumber: number;
  readonly sourceSha?: string;
}
