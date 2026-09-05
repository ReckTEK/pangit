import type { ForgejoProviderTypes } from "../provider-types.ts";
import { validateMergeExtension } from "./merge-validation.ts";

import type { ProviderExtensions } from "../../../fluent-api/provider-extensions/ExtensionSupport.ts";
import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import { validateForgejoCreateReviewExtension } from "./review-validation.ts";

export const forgejoExtensions = Object.freeze(
  {
    "auth.basic": { versions: "all" },
    "content.commitChanges": { versions: "all" },
    "pullRequests.merge": {
      versions: "all",
      validate: (options, context) => validateMergeExtension(options, context),
    },
    "pullRequestReviews.create": {
      versions: "all",
      validate: (options, context) => validateForgejoCreateReviewExtension(options, context),
    },
    "statuses.set": {
      versions: "all",
      validate: (options, context) => {
        if (!["error", "warning", "skipped"].includes(options.state)) {
          throw new ValidationError("invalid Forgejo commit-status state", context);
        }
      },
    },
  } satisfies ProviderExtensions<"forgejo", ForgejoProviderTypes>,
);
