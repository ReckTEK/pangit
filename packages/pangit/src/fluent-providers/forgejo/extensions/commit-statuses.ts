import type {
  CommitStatusReference,
  CommitStatusState,
} from "../../../fluent-api/adapter-contract/commit-statuses.ts";

/** Forgejo status states that have no portable meaning across fluent providers. */
export type ForgejoCommitStatusExtensionState = "error" | "warning" | "skipped";

/** Forgejo-only state selection for one status publication. */
export interface ForgejoSetCommitStatusExtension {
  readonly state: ForgejoCommitStatusExtensionState;
}

/** Immutable context exposed to the Forgejo status extension callback. */
export interface ForgejoSetCommitStatusExtensionContext {
  readonly repositoryFullName: string;
  readonly reference: CommitStatusReference;
  readonly context: string;
  readonly portableState: CommitStatusState;
}
