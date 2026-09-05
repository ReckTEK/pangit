import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { invalid, unavailable } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";

import { pin } from "./paths.ts";
import { readContent } from "./read-file.ts";

export function symlinkOperations<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "readSymlink"> {
  const ops: Pick<Adapter<V>, "readSymlink"> = {
    readSymlink: async (r, p, o = {}) => {
      const ref = await pin(c, r, o.ref, o);
      const link = await readContent(c, r, p, { ...o, ref });
      if (link.kind !== "symlink") invalid(c, "readSymlink", "Path is not a symlink");
      if (!o.dereference) return link;
      const pieces = p.split("/").slice(0, -1);
      if (link.target?.startsWith("/")) {
        unavailable(c, "readSymlink", "Symlink target escapes repository");
      }
      for (const piece of (link.target ?? "").split("/")) {
        if (piece === "..") {
          if (!pieces.length) unavailable(c, "readSymlink", "Symlink target escapes repository");
          pieces.pop();
        } else if (piece !== "." && piece !== "") pieces.push(piece);
      }
      const target = await readContent(c, r, pieces.join("/"), { ...o, ref });
      if (target.kind !== "file") {
        invalid(c, "readSymlink", "Only one internal file target can be dereferenced");
      }
      return Object.freeze({ ...link, dereferenced: target });
    },
  };
  return ops;
}
