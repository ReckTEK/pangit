import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type { BranchData } from "../../../fluent-api/adapter-contract/branches.ts";

import { type Dto, id, object, required } from "../transport/mod.ts";
import { door } from "../native/door.ts";

export async function branch<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<BranchData<"gitlab", V>> {
  return Object.freeze({
    name: required(c, "normalizeBranch", p.name),
    sha: id(c, "normalizeBranch", object(c, "normalizeBranch", p.commit).id),
    // GL-001: the server's cached flag can contradict configured rules and actual intent.
    // Preserve it only in the native payload until a fixed GitLab version is supported.
    native: await door(c, "branch", p),
  });
}
