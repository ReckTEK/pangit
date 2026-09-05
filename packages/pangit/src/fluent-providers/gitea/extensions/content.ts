import type { GitActor } from "../../../fluent-api/adapter-contract/commits.ts";

/** Gitea-only authorship and branch-update controls for one atomic file-change commit. */
export interface GiteaCommitFileChangesExtension {
  readonly forcePush?: boolean;
  readonly signoff?: boolean;
  readonly committer?: GitActor;
  readonly authorDate?: string;
  readonly committerDate?: string;
}

/** Immutable operation context visible to a Gitea file-change extension callback. */
export interface GiteaCommitFileChangesExtensionContext {
  readonly repositoryFullName: string;
  readonly branch: string;
  readonly changeCount: number;
}
