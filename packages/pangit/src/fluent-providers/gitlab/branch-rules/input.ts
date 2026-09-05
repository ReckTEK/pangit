import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import type { BranchRuleFields } from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";
import { unavailable } from "../transport/mod.ts";

export function ruleInput(c: GitLabAdapterContext<GitLabVersion>, i: BranchRuleFields) {
  for (const key of Object.keys(i)) {
    if (key !== "pushAllowed" && key !== "forcePushAllowed" && key !== "name") {
      unavailable(
        c,
        "branchRules",
        `GitLab protected branches cannot express ${key} through the portable contract`,
      );
    }
  }
  return {
    push_access_level: i.pushAllowed === undefined
      ? undefined
      : i.pushAllowed
      ? 30 as const
      : 0 as const,
    allow_force_push: i.forcePushAllowed,
  };
}
