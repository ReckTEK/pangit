import type { GitActor } from "../../../fluent-api/adapter-contract/commits.ts";

/** Forgejo-only authorship and branch-update controls for one atomic file-change commit. */
export interface ForgejoCommitFileChangesExtension {
  readonly forceOverwriteNewBranch?: boolean;
  readonly signoff?: boolean;
  readonly committer?: GitActor;
  readonly authorDate?: string;
  readonly committerDate?: string;
}

/** Immutable operation context visible to a Forgejo file-change extension callback. */
export interface ForgejoCommitFileChangesExtensionContext {
  readonly repositoryFullName: string;
  readonly branch: string;
  readonly changeCount: number;
}
