/** GitLab atomic commit controls. startSha replaces the source branch for a new branch. */
export interface GitLabCommitFileChangesExtension {
  readonly force?: boolean;
  readonly startSha?: string;
}

/** Immutable operation context visible to a GitLab file-change extension callback. */
export interface GitLabCommitFileChangesExtensionContext {
  readonly repositoryFullName: string;
  readonly branch: string;
  readonly changeCount: number;
}
