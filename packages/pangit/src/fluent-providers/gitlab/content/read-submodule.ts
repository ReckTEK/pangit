import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { call, invalid, object, unavailable } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";

import { repository } from "../repositories/normalize.ts";
import { normalizePath, pin } from "./paths.ts";
import { readContent, readFileOperations } from "./read-file.ts";

export function submoduleOperations<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "readSubmodule"> {
  const ops: Pick<Adapter<V>, "readSubmodule"> = {
    readSubmodule: async (r, p, o = {}) => {
      const ref = await pin(c, r, o.ref, o);
      const link = await readContent(c, r, p, { ...o, ref });
      if (link.kind !== "submodule") invalid(c, "readSubmodule", "Path is not a submodule");
      const config = await readFileOperations(c).readContentText(r, ".gitmodules", { ...o, ref });
      let currentPath: string | undefined;
      let submoduleUrl: string | undefined;
      for (const section of config.split(/^\s*\[submodule /m).slice(1)) {
        currentPath = /^\s*path\s*=\s*(.+)$/m.exec(section)?.[1]?.trim();
        if (currentPath === p) {
          submoduleUrl = /^\s*url\s*=\s*(.+)$/m.exec(section)?.[1]?.trim();
          break;
        }
      }
      if (!o.dereference) return Object.freeze({ ...link, submoduleUrl });
      if (!submoduleUrl) invalid(c, "readSubmodule", "Submodule URL is missing");
      const root = c.webBaseUrl();
      const relativeBase = new URL(`${r.fullName}.git/`, root);
      const url = new URL(submoduleUrl, relativeBase);
      if (
        url.origin !== root.origin || url.username || url.password ||
        !url.pathname.startsWith(root.pathname) || url.search || url.hash
      ) {
        unavailable(c, "readSubmodule", "Submodule target is not internal to this provider");
      }
      const full = decodeURIComponent(url.pathname.slice(root.pathname.length)).replace(
        /\.git$/,
        "",
      );
      normalizePath(c, full);
      const target = await repository(
        c,
        object(
          c,
          "readSubmodule",
          (await call(c, "readSubmodule", "getApiV4ProjectsId", { path: { id: full } }, o)).body,
        ),
      );
      return Object.freeze({
        ...link,
        submoduleUrl,
        dereferenced: await readContent(c, target, "", { ...o, ref: link.sha }),
      });
    },
  };
  return ops;
}
