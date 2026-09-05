import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type { RepositoryContainerData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { type Dto, id, invalid, required, text } from "../transport/mod.ts";

import { door } from "../native/door.ts";

export async function container<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<RepositoryContainerData<"gitlab", V, GitLabProviderTypes>> {
  if (p.kind !== "user" && p.kind !== "group") {
    invalid(c, "normalizeContainer", "Unsupported GitLab namespace kind");
  }
  return Object.freeze({
    id: id(c, "normalizeContainer", p.id),
    kind: p.kind,
    name: required(c, "normalizeContainer", p.full_path),
    displayName: text(p.name),
    native: await door(c, "repositoryContainer", p),
  });
}
