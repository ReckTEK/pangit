/** Exact Forgejo review events accepted by its create-review operation. */
export type ForgejoPullRequestReviewEvent =
  | "approve"
  | "comment"
  | "pending"
  | "request-changes"
  | "request-review";

/** Exact old/new diff coordinates accepted for one Forgejo review comment. */
export interface ForgejoPullRequestReviewComment {
  readonly body: string;
  readonly path: string;
  readonly oldPosition?: number;
  readonly newPosition?: number;
}

/** Forgejo-only review creation controls kept out of the portable pending-review input. */
export interface ForgejoCreatePullRequestReviewExtension {
  readonly event?: ForgejoPullRequestReviewEvent;
  readonly comments?: readonly ForgejoPullRequestReviewComment[];
}

/** Safe operation context passed to the Forgejo review extension callback. */
export interface ForgejoCreatePullRequestReviewExtensionContext {
  readonly repositoryFullName: string;
  readonly pullRequestNumber: number;
  readonly sourceSha?: string;
}
