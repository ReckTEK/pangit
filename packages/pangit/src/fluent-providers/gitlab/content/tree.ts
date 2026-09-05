import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type { ContentData } from "../../../fluent-api/adapter-contract/content.ts";

import {
  IncompleteHistoryError,
  NotFoundError,
} from "../../../fluent-api/adapter-contract/errors.ts";

import { context, type Dto, id, page, path, required } from "../transport/mod.ts";
import { door } from "../native/door.ts";
import type { Repo } from "../adapter.ts";

export const MAX_DIRECTORY_ENTRIES = 10000;

export async function tree<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  folder: string,
  ref: string,
  o: { signal?: AbortSignal },
  max = MAX_DIRECTORY_ENTRIES,
): Promise<Dto[]> {
  const result: Dto[] = [];
  let cursor: string | undefined;
  do {
    const p = await page(
      c,
      "listDirectory",
      "getApiV4ProjectsIdRepositoryTree",
      { path: path(r), query: { path: folder, ref, recursive: false } },
      { limit: Math.min(100, max - result.length + 1), cursor, ...o },
      (p) => p,
    );
    result.push(...p.items);
    if (result.length > max) {
      throw new IncompleteHistoryError(
        "Directory exceeds its caller-selected entry bound",
        context(c, "listDirectory"),
      );
    }
    cursor = p.nextCursor;
  } while (cursor);
  return result;
}

export async function entry<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  name: string,
  ref: string,
  o: { signal?: AbortSignal },
): Promise<Dto> {
  const folder = name.slice(0, Math.max(0, name.lastIndexOf("/")));
  const found = (await tree(c, r, folder, ref, o)).find((e) => e.path === name);
  if (!found) {
    throw new NotFoundError("Repository path was not found", {
      ...context(c, "readContent"),
      status: 404,
    });
  }
  return found;
}

export async function treeContent<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<ContentData<"gitlab", V>> {
  const mode = required(c, "readContent", p.mode);
  const kind = mode === "120000"
    ? "symlink"
    : mode === "160000"
    ? "submodule"
    : p.type === "tree"
    ? "directory"
    : "file";
  return Object.freeze({
    kind,
    path: required(c, "readContent", p.path),
    name: required(c, "readContent", p.name),
    sha: id(c, "readContent", p.id),
    native: await door(c, "content", p),
  });
}
