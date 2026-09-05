import type {
  CommitStatusReference,
  CommitStatusState,
} from "../../../fluent-api/adapter-contract/commit-statuses.ts";

/** Native GitLab states remain visible without inventing a portable equivalent. */
export interface GitLabSetCommitStatusExtension {
  readonly state: "running" | "canceled" | "skipped";
}

/** Immutable context exposed to the GitLab status extension callback. */
export interface GitLabSetCommitStatusExtensionContext {
  readonly repositoryFullName: string;
  readonly reference: CommitStatusReference;
  readonly context: string;
  readonly portableState: CommitStatusState;
}
