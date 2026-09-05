import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import type { BranchRuleData } from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";
import { array, type Dto, required } from "../transport/mod.ts";
import { door } from "../native/door.ts";

export async function rule<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<BranchRuleData<"gitlab", V>> {
  const levels = array(c, "normalizeBranchRule", p.push_access_levels);
  return Object.freeze({
    name: required(c, "normalizeBranchRule", p.name),
    pushAllowed: levels.some((p) => Number(p.access_level) > 0 || p.user_id || p.group_id),
    forcePushAllowed: typeof p.allow_force_push === "boolean" ? p.allow_force_push : undefined,
    statusCheckContexts: Object.freeze([]),
    native: await door(c, "configuredRule", p),
  });
}
