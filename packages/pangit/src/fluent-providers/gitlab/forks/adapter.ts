import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { body, call, id, invalid, object, page, path } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";

import { pollGitLab } from "../transport/response/mod.ts";

import { repository } from "../repositories/normalize.ts";
export function forks<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "listForks" | "createFork"> {
  const ops: Pick<Adapter<V>, "listForks" | "createFork"> = {
    listForks: (r, q) =>
      page(
        c,
        "listForks",
        "getApiV4ProjectsIdForks",
        { path: path(r) },
        q,
        (p) => repository(c, p),
      ),
    createFork: async (r, o) => {
      const p = object(
        c,
        "createFork",
        (await call(c, "createFork", "postApiV4ProjectsIdFork", {
          path: path(r),
          body: body({
            namespace_path: o.destination.name,
            name: o.name,
            path: o.name,
          }),
        }, o)).body,
      );
      const forkId = id(c, "createFork", p.id);
      const intervalMs = o.pollIntervalMs ?? 200;
      if (intervalMs <= 0) invalid(c, "createFork", "pollIntervalMs must be positive");
      return await pollGitLab(c, { universal: "createFork" }, {
        attempts: Math.ceil((o.timeoutMs ?? 30000) / intervalMs),
        intervalMs,
        signal: o.signal,
      }, async () => {
        const fresh = object(
          c,
          "createFork",
          (await call(c, "createFork", "getApiV4ProjectsId", { path: { id: forkId } }, o)).body,
        );
        if (fresh.import_status === "failed") invalid(c, "createFork", "GitLab fork import failed");
        return fresh.import_status === "finished" || fresh.import_status === "none"
          ? await repository(c, fresh)
          : undefined;
      });
    },
  };
  return ops;
}
