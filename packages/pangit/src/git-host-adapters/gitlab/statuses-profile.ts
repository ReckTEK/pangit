import { commits } from "./commits.ts";
import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import type {
  CommitStatusData,
  CommitStatusState,
} from "../../fluent-api/adapter-contract/commit-statuses.ts";
import { IncompleteHistoryError } from "../../fluent-api/adapter-contract/errors.ts";
import {
  type Adapter,
  body,
  call,
  context,
  door,
  type Dto,
  extra,
  id,
  object,
  page,
  path,
  required,
  text,
} from "./shared.ts";
const states: Readonly<Record<string, CommitStatusState | undefined>> = {
  pending: "pending",
  success: "success",
  failed: "failure",
};
async function status<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
  ref: string,
): Promise<CommitStatusData<"gitlab", V>> {
  const providerState = required(c, "normalizeCommitStatus", p.status);
  return Object.freeze({
    id: id(c, "normalizeCommitStatus", p.id),
    ref,
    context: required(c, "normalizeCommitStatus", p.name),
    state: states[providerState],
    providerState,
    description: text(p.description),
    targetUrl: text(p.target_url),
    creator: p.author ? text(object(c, "normalizeCommitStatus", p.author).username) : undefined,
    createdAt: text(p.created_at),
    updatedAt: text(p.finished_at),
    native: await door(c, "commitStatus", p),
  });
}
export function statusesProfile<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const ops: Pick<
    Adapter<V>,
    | "currentUserProfileSupport"
    | "getCurrentUserProfile"
    | "listCommitStatuses"
    | "getCommitStatus"
    | "setCommitStatus"
  > = {
    currentUserProfileSupport: Object.freeze({ supported: true, current: "direct" }),
    getCurrentUserProfile: async (o) => {
      const p = object(
        c,
        "getCurrentUserProfile",
        (await extra(c, "getCurrentUserProfile", "GET", "/user", {}, o)).body,
      );
      return Object.freeze({
        id: id(c, "getCurrentUserProfile", p.id),
        username: required(c, "getCurrentUserProfile", p.username),
        displayName: text(p.name),
        email: text(p.email),
        avatarUrl: text(p.avatar_url),
        webUrl: text(p.web_url),
        native: await door(c, "currentUserProfile", p),
      });
    },
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
      const items: CommitStatusData<"gitlab", V>[] = [];
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
        state: states[providerState],
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
