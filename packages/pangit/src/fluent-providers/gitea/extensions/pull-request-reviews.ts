/** Exact Gitea review events accepted by its create-review operation. */
export type GiteaPullRequestReviewEvent =
  | "approve"
  | "comment"
  | "pending"
  | "request-changes"
  | "request-review";

/** Exact old/new diff coordinates accepted for one Gitea review comment. */
export interface GiteaPullRequestReviewComment {
  readonly body: string;
  readonly path: string;
  readonly oldPosition?: number;
  readonly newPosition?: number;
}

/** Gitea-only review creation controls kept out of the portable pending-review input. */
export interface GiteaCreatePullRequestReviewExtension {
  readonly event?: GiteaPullRequestReviewEvent;
  readonly comments?: readonly GiteaPullRequestReviewComment[];
}

/** Safe operation context passed to the Gitea review extension callback. */
export interface GiteaCreatePullRequestReviewExtensionContext {
  readonly repositoryFullName: string;
  readonly pullRequestNumber: number;
  readonly sourceSha?: string;
}
