import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import type { TagData } from "../../../fluent-api/adapter-contract/tags.ts";

import { type Dto, id, object, required, text } from "../transport/mod.ts";
import { door } from "../native/door.ts";

export async function tag<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<TagData<"gitlab", V, GitLabProviderTypes>> {
  return Object.freeze({
    name: required(c, "normalizeTag", p.name),
    sha: id(c, "normalizeTag", object(c, "normalizeTag", p.commit).id),
    message: text(p.message),
    annotated: p.message !== null && typeof p.message === "string",
    native: await door(c, "tag", p),
  });
}
