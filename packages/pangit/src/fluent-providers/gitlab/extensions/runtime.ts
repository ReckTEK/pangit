import type {} from "../registration.ts";
import type { ProviderExtensions } from "../../../fluent-api/provider-extensions/ExtensionSupport.ts";
import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";

export const gitlabExtensions = Object.freeze(
  {
    "content.commitChanges": { versions: "all" },
    "pullRequests.merge": { versions: "all" },
    "statuses.set": {
      versions: "all",
      validate: (options, context) => {
        if (!["running", "canceled", "skipped"].includes(options.state)) {
          throw new ValidationError("invalid GitLab commit-status state", context);
        }
      },
    },
  } satisfies ProviderExtensions<"gitlab">,
);
