import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { body, call, object, page, path } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";

import { tag } from "./normalize.ts";

export function tags<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "listTags" | "getTag" | "createTag" | "deleteTag"> {
  const ops: Pick<Adapter<V>, "listTags" | "getTag" | "createTag" | "deleteTag"> = {
    listTags: (r, q) =>
      page(
        c,
        "listTags",
        "getApiV4ProjectsIdRepositoryTags",
        { path: path(r) },
        q,
        (p) => tag(c, p),
      ),
    getTag: async (r, name, o) =>
      tag(
        c,
        object(
          c,
          "getTag",
          (await call(c, "getTag", "getApiV4ProjectsIdRepositoryTagsTagName", {
            path: { ...path(r), tag_name: name },
          }, o)).body,
        ),
      ),
    createTag: async (r, i, o) =>
      tag(
        c,
        object(
          c,
          "createTag",
          (await call(c, "createTag", "postApiV4ProjectsIdRepositoryTags", {
            path: path(r),
            body: body({ tag_name: i.name, ref: i.target, message: i.message }),
          }, o)).body,
        ),
      ),
    deleteTag: async (r, t, o) => {
      await call(c, "deleteTag", "deleteApiV4ProjectsIdRepositoryTagsTagName", {
        path: { ...path(r), tag_name: t.name },
      }, o);
    },
  };
  return ops;
}
