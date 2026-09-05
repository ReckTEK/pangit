import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { type Dto, id, invalid, object, required, text } from "../transport/mod.ts";

import { door } from "../native/door.ts";

export async function repository<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<RepositoryData<"gitlab", V, GitLabProviderTypes>> {
  const fullName = required(c, "normalizeRepository", p.path_with_namespace);
  const split = fullName.lastIndexOf("/");
  if (split < 1) invalid(c, "normalizeRepository", "Project has no namespace");
  const parent = p.forked_from_project
    ? object(c, "normalizeRepository", p.forked_from_project)
    : undefined;
  const parentName = parent && required(c, "normalizeRepository", parent.path_with_namespace);
  return Object.freeze({
    id: id(c, "normalizeRepository", p.id),
    owner: fullName.slice(0, split),
    name: fullName.slice(split + 1),
    fullName,
    description: text(p.description),
    defaultBranch: text(p.default_branch),
    private: p.visibility === "private",
    url: text(p.web_url),
    ...(parent && parentName
      ? {
        parent: {
          provider: "gitlab" as const,
          id: id(c, "normalizeRepository", parent.id),
          owner: parentName.slice(0, parentName.lastIndexOf("/")),
          name: parentName.slice(parentName.lastIndexOf("/") + 1),
          fullName: parentName,
        },
      }
      : {}),
    native: await door(c, "repository", p),
  });
}
