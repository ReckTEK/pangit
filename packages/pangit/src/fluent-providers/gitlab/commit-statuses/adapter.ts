import type { GitLabProviderTypes } from "../provider-types.ts";
import { commits } from "../commits/mod.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type { CommitStatusData } from "../../../fluent-api/adapter-contract/commit-statuses.ts";
import { IncompleteHistoryError } from "../../../fluent-api/adapter-contract/errors.ts";
import { body, call, context, object, page, path } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { normalizeCommitStatusState, status } from "./normalize.ts";

export function commitStatuses<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "listCommitStatuses" | "getCommitStatus" | "setCommitStatus"> {
  const ops: Pick<Adapter<V>, "listCommitStatuses" | "getCommitStatus" | "setCommitStatus"> = {
    listCommitStatuses: async (r, ref, q) => {
      const resolved = /^[a-f0-9]{40}$/i.test(ref)
        ? ref
        : (await commits(c).getCommit(r, ref, q)).sha;
      return await page(
        c,
        "listCommitStatuses",
        "getApiV4ProjectsIdRepositoryCommitsShaStatuses",
        {
          path: { ...path(r), sha: resolved },
          query: { all: false, order_by: "id", sort: "desc" },
        },
        q,
        (p) => status(c, p, ref),
      );
    },
    getCommitStatus: async (r, ref, o) => {
      const resolved = /^[a-f0-9]{40}$/i.test(ref)
        ? ref
        : (await commits(c).getCommit(r, ref, o)).sha;
      const items: CommitStatusData<"gitlab", V, GitLabProviderTypes>[] = [];
      let cursor: string | undefined;
      do {
        const p = await ops.listCommitStatuses(r, resolved, { limit: 100, cursor, ...o });
        items.push(...p.items);
        cursor = p.nextCursor;
        if (items.length > 1000 || (items.length === 1000 && cursor)) {
          throw new IncompleteHistoryError(
            "Commit status aggregation exceeds 1000 entries",
            context(c, "getCommitStatus"),
          );
        }
      } while (cursor);
      const latest = [
        ...new Map([...items].reverse().map((item) => [item.context, item])).values(),
      ];
      const providerState = latest.some((s) => s.providerState === "failed")
        ? "failed"
        : latest.some((s) => s.providerState === "pending")
        ? "pending"
        : latest.length > 0 && latest.every((s) => s.providerState === "success")
        ? "success"
        : latest.find((s) => s.providerState !== "success")?.providerState ?? "pending";
      return Object.freeze({
        ref,
        statuses: Object.freeze(latest),
        totalCount: latest.length,
        providerState,
        state: normalizeCommitStatusState(providerState),
      });
    },
    setCommitStatus: async (r, ref, i, o) => {
      const resolved = /^[a-f0-9]{40}$/i.test(ref)
        ? ref
        : (await commits(c).getCommit(r, ref, o)).sha;
      return await status(
        c,
        object(
          c,
          "setCommitStatus",
          (await call(c, "setCommitStatus", "postApiV4ProjectsIdStatusesSha", {
            path: { ...path(r), sha: resolved },
            body: body({
              state: o?.extension?.state ?? (i.state === "failure" ? "failed" as const : i.state),
              name: i.context,
              description: i.description,
              target_url: i.targetUrl,
            }),
          }, o)).body,
        ),
        ref,
      );
    },
  };
  return ops;
}
