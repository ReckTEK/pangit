import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import {
  ContentUnavailableError,
  NotFoundError,
} from "../../../fluent-api/adapter-contract/errors.ts";

import { batch, invalid } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";

import { normalizePath, pin } from "./paths.ts";

import { readContent } from "./read-file.ts";

export function readFilesOperations<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "readFiles"> {
  const ops: Pick<Adapter<V>, "readFiles"> = {
    readFiles: async (r, paths, o = {}) => {
      paths.forEach((p) => normalizePath(c, p));
      if (paths.length > (o.maxItems ?? 200)) invalid(c, "readFiles", "Batch exceeds maxItems");
      if (paths.length === 0) return Object.freeze([]);
      const ref = await pin(c, r, o.ref, o);
      return await batch(c, "readFiles", paths, o, 200, async (p) => {
        try {
          const result = await readContent(c, r, p, { ...o, ref });
          return result.kind === "file"
            ? Object.freeze({ path: p, content: result })
            : Object.freeze({ path: p, unavailable: "not-a-file" as const });
        } catch (e) {
          if (e instanceof NotFoundError) {
            return Object.freeze({ path: p, unavailable: "missing" as const });
          }
          if (e instanceof ContentUnavailableError) {
            return Object.freeze({ path: p, unavailable: "too-large" as const });
          }
          throw e;
        }
      });
    },
  };
  return ops;
}
