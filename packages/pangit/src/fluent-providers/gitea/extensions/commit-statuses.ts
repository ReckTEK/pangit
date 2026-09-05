import type {
  CommitStatusReference,
  CommitStatusState,
} from "../../../fluent-api/adapter-contract/commit-statuses.ts";

/** Gitea status states that have no portable meaning across fluent providers. */
export type GiteaCommitStatusExtensionState = "error" | "warning" | "skipped";

/** Gitea-only state selection for one status publication. */
export interface GiteaSetCommitStatusExtension {
  readonly state: GiteaCommitStatusExtensionState;
}

/** Immutable context exposed to the Gitea status extension callback. */
export interface GiteaSetCommitStatusExtensionContext {
  readonly repositoryFullName: string;
  readonly reference: CommitStatusReference;
  readonly context: string;
  readonly portableState: CommitStatusState;
}
