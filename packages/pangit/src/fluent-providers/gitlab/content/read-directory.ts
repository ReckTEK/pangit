import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type { ContentData } from "../../../fluent-api/adapter-contract/content.ts";

import { IncompleteHistoryError } from "../../../fluent-api/adapter-contract/errors.ts";

import { context, invalid, required } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";

import { readContent } from "./read-file.ts";
import { normalizePath, pin } from "./paths.ts";

import { MAX_DIRECTORY_ENTRIES, tree, treeContent } from "./tree.ts";

export function directoryOperations<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "getDirectory" | "listDirectory"> {
  const ops: Pick<Adapter<V>, "getDirectory" | "listDirectory"> = {
    getDirectory: async (r, p, o) => {
      const result = await readContent(c, r, p, { ...o, includeBytes: false });
      if (result.kind !== "directory") invalid(c, "getDirectory", "Path is not a directory");
      return result;
    },
    listDirectory: async (r, p, o = {}) => {
      p = normalizePath(c, p, true);
      if ((o.recursive || o.collapseSingleFolders) && !o.maxDepth || o.recursive && !o.maxItems) {
        invalid(c, "listDirectory", "Recursive/collapsed reads require maxDepth and maxItems");
      }
      const ref = await pin(c, r, o.ref, o);
      const max = o.maxItems ?? MAX_DIRECTORY_ENTRIES;
      const values: ContentData<"gitlab", V, GitLabProviderTypes>[] = [];
      const visit = async (folder: string, depth: number): Promise<void> => {
        const rows = await tree(c, r, folder, ref, o, max - values.length);
        if (
          o.collapseSingleFolders && depth < (o.maxDepth ?? 0) && rows.length === 1 &&
          rows[0].type === "tree"
        ) {
          await visit(required(c, "listDirectory", rows[0].path), depth + 1);
          return;
        }
        for (const p of rows) {
          const meta = await treeContent(c, p);
          values.push(meta);
          if (values.length > max) {
            throw new IncompleteHistoryError(
              "Directory traversal exceeded maxItems",
              context(c, "listDirectory"),
            );
          }
          if (o.recursive && meta.kind === "directory" && depth < (o.maxDepth ?? 0)) {
            await visit(meta.path, depth + 1);
          }
        }
      };
      await visit(p, 0);
      return Object.freeze(values);
    },
  };
  return ops;
}
