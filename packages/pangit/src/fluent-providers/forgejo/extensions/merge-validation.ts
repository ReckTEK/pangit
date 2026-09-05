import type { ForgejoMergePullRequestExtension } from "./pull-requests.ts";
import {
  ValidationError,
  type ValidationErrorContext,
} from "../../../fluent-api/adapter-contract/errors.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

export function validateMergeExtension(
  extension: Readonly<ForgejoMergePullRequestExtension>,
  context: ValidationErrorContext,
): void {
  const supportedMethods = new Set([
    "fast-forward-only",
    "manually-merged",
    "merge",
    "rebase",
    "rebase-merge",
    "squash",
  ]);
  if (extension.method !== undefined && !supportedMethods.has(extension.method)) {
    throw new ValidationError("invalid Forgejo pull-request merge method", context);
  }
  if (extension.headCommitId !== undefined) {
    requireIdentity(extension.headCommitId, "pull request merge head commit ID", context);
  }
  if (extension.mergeCommitId !== undefined) {
    requireIdentity(extension.mergeCommitId, "pull request merge commit ID", context);
  }
  if (
    extension.mergeWhenChecksSucceed === true && extension.scheduledCompletion === undefined
  ) {
    throw new ValidationError(
      "scheduled Forgejo merge requires an explicit completion polling bound",
      context,
    );
  }
  if (
    extension.scheduledCompletion !== undefined && extension.mergeWhenChecksSucceed !== true
  ) {
    throw new ValidationError(
      "scheduled completion polling requires mergeWhenChecksSucceed",
      context,
    );
  }
  if (extension.scheduledCompletion !== undefined) {
    requirePositiveInteger(
      extension.scheduledCompletion.attempts,
      "scheduled merge poll attempts",
      context,
    );
    const intervalMs = extension.scheduledCompletion.intervalMs;
    if (intervalMs !== undefined && (!Number.isSafeInteger(intervalMs) || intervalMs < 0)) {
      throw new ValidationError(
        "scheduled merge poll interval must be a non-negative safe integer",
        context,
      );
    }
  }
}
