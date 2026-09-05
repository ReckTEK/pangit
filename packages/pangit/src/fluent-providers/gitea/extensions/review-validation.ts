import {
  ValidationError,
  type ValidationErrorContext,
} from "../../../fluent-api/adapter-contract/errors.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { GiteaCreatePullRequestReviewExtension } from "./pull-request-reviews.ts";

const GITEA_REVIEW_EVENTS = [
  "approve",
  "comment",
  "pending",
  "request-changes",
  "request-review",
] as const;

export function validateGiteaCreateReviewExtension(
  extension: Readonly<GiteaCreatePullRequestReviewExtension>,
  context: ValidationErrorContext,
): void {
  if (
    extension.event !== undefined &&
    !GITEA_REVIEW_EVENTS.includes(extension.event)
  ) {
    throw new ValidationError("invalid pull-request review event", context);
  }
  if (extension.comments === undefined) return;
  if (extension.comments.length === 0) {
    throw new ValidationError("Gitea review comments cannot be empty", context);
  }
  extension.comments.forEach((comment, index) => {
    requireIdentity(comment.body, `review comment ${index} body`, context);
    requireIdentity(comment.path, `review comment ${index} path`, context);
    if (comment.oldPosition !== undefined) {
      requirePositiveInteger(comment.oldPosition, `review comment ${index} old position`, context);
    }
    if (comment.newPosition !== undefined) {
      requirePositiveInteger(comment.newPosition, `review comment ${index} new position`, context);
    }
    if (comment.oldPosition === undefined && comment.newPosition === undefined) {
      throw new ValidationError(
        `review comment ${index} requires an old or new position`,
        context,
      );
    }
  });
}
