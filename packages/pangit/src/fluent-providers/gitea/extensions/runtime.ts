import type { GiteaProviderTypes } from "../provider-types.ts";
import { validateMergeExtension } from "./merge-validation.ts";

import type { ProviderExtensions } from "../../../fluent-api/provider-extensions/ExtensionSupport.ts";
import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import { validateGiteaCreateReviewExtension } from "./review-validation.ts";

export const giteaExtensions = Object.freeze(
  {
    "auth.basic": { versions: "all" },
    "commits.compare": { versions: ["1.27.2"] },
    "content.commitChanges": { versions: "all" },
    "pullRequests.merge": {
      versions: "all",
      validate: (options, context) => validateMergeExtension(options, context),
    },
    "pullRequestReviews.create": {
      versions: "all",
      validate: (options, context) => validateGiteaCreateReviewExtension(options, context),
    },
    "statuses.set": {
      versions: "all",
      validate: (options, context) => {
        if (!["error", "warning", "skipped"].includes(options.state)) {
          throw new ValidationError("invalid Gitea commit-status state", context);
        }
      },
    },
    "issues.update": {
      versions: "all",
      validate: (options, context) => {
        const value = options.contentVersion;
        if (typeof value === "bigint" ? value < 0n : !Number.isSafeInteger(value) || value < 0) {
          throw new ValidationError(
            "content version must be a non-negative integer",
            context,
          );
        }
      },
    },
    "branchRules.setOrder": {
      versions: "all",
      validate: (options, context) => {
        const names = options.orderedRuleNames;
        names.forEach((name) => requireIdentity(name, "branch rule name", context));
        if (!names.length) {
          throw new ValidationError("ordered branch rules cannot be empty", context);
        }
        if (new Set(names).size !== names.length) {
          throw new ValidationError(
            "ordered branch rules cannot contain duplicates",
            context,
          );
        }
      },
    },
  } satisfies ProviderExtensions<"gitea", GiteaProviderTypes>,
);
