import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { batch, id, invalid, optional } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { commits } from "../commits/mod.ts";
import { normalizePath, pin } from "./paths.ts";

import { readContent } from "./read-file.ts";
import { entry } from "./tree.ts";

export function metadataOperations<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "readPathMetadataBatch"> {
  const ops: Pick<Adapter<V>, "readPathMetadataBatch"> = {
    readPathMetadataBatch: async (r, paths, o = {}) => {
      paths.forEach((p) => normalizePath(c, p));
      if (paths.length > (o.maxItems ?? 200)) {
        invalid(c, "readPathMetadataBatch", "Batch exceeds maxItems");
      }
      if (paths.length === 0) return Object.freeze([]);
      const ref = await pin(c, r, o.ref, o);
      const parent = o.compareFirstParent
        ? (await commits(c).getCommit(r, ref, o)).parents[0]
        : undefined;
      return await batch(c, "readPathMetadataBatch", paths, o, 200, async (p, signal) => {
        const value = await optional(() =>
          readContent(c, r, p, {
            ...o,
            ref,
            signal,
            includeBytes: false,
            includeCommitMetadata: true,
          })
        );
        if (!value) return { path: p, unavailable: "missing" as const };
        const before = parent
          ? await optional(() => entry(c, r, p, parent, { ...o, signal }))
          : undefined;
        return {
          path: p,
          content: Object.freeze({
            ...value,
            firstParentSha: before ? id(c, "readPathMetadataBatch", before.id) : undefined,
          }),
        };
      });
    },
  };
  return ops;
}
