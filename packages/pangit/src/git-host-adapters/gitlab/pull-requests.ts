import type { OperationOptions } from "../../fluent-api/adapter-contract/operation-options.ts";
import { ConflictError, NotFoundError } from "../../fluent-api/adapter-contract/errors.ts";
import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import type { PullRequestData } from "../../fluent-api/adapter-contract/pull-requests.ts";
import {
  type Adapter,
  array,
  body,
  call,
  context,
  door,
  type Dto,
  extra,
  id,
  invalid,
  number,
  numericId,
  object,
  page,
  path,
  type Repo,
  required,
  text,
} from "./shared.ts";
import { commit, file } from "./commits.ts";
import { repository } from "./repositories.ts";
import { pollGitLab } from "./response.ts";
export async function pullRequest<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  p: Dto,
  o: OperationOptions = {},
): Promise<PullRequestData<"gitlab", V>> {
  const sourceId = id(c, "normalizePullRequest", p.source_project_id);
  let source = r;
  if (sourceId !== r.id) {
    source = await repository(
      c,
      object(
        c,
        "normalizePullRequest",
        (await call(c, "normalizePullRequest", "getApiV4ProjectsId", { path: { id: sourceId } }, o))
          .body,
      ),
    );
  }
  const refs = p.diff_refs ? object(c, "normalizePullRequest", p.diff_refs) : undefined;
  return Object.freeze({
    id: id(c, "normalizePullRequest", p.id),
    number: number(c, "normalizePullRequest", p.iid),
    title: required(c, "normalizePullRequest", p.title),
    description: text(p.description),
    state: p.state === "opened" ? "open" : "closed",
    source: {
      owner: source.owner,
      repository: source.name,
      branch: required(c, "normalizePullRequest", p.source_branch),
      sha: text(p.sha),
    },
    target: {
      owner: r.owner,
      repository: r.name,
      branch: required(c, "normalizePullRequest", p.target_branch),
    },
    author: p.author ? text(object(c, "normalizePullRequest", p.author).username) : undefined,
    merged: p.state === "merged",
    mergeable: p.detailed_merge_status === "mergeable"
      ? true
      : p.detailed_merge_status === "conflict"
      ? false
      : undefined,
    mergeBaseSha: text(refs?.base_sha),
    mergeCommitSha: text(p.merge_commit_sha) ?? text(p.squash_commit_sha),
    url: text(p.web_url),
    native: await door(c, "pullRequest", p),
  });
}
export function pullRequests<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const ops: Pick<
    Adapter<V>,
    | "listPullRequests"
    | "getPullRequest"
    | "findPullRequest"
    | "isPullRequestMerged"
    | "listPullRequestCommits"
    | "listPullRequestFiles"
    | "createPullRequest"
    | "updatePullRequest"
    | "closePullRequest"
    | "mergePullRequest"
    | "requestPullRequestReviewers"
    | "approvePullRequest"
    | "publishPullRequestComment"
  > = {
    listPullRequests: (r, q) =>
      page(
        c,
        "listPullRequests",
        "getApiV4ProjectsIdMergeRequests",
        {
          path: path(r),
          query: {
            state: q.state === "open" ? "opened" : q.state,
            target_branch: q.base,
            source_branch: q.head,
            author_username: q.author,
            search: q.query,
          },
        },
        q,
        (p) => pullRequest(c, r, p, q),
      ),
    getPullRequest: async (r, n, o) =>
      pullRequest(
        c,
        r,
        object(
          c,
          "getPullRequest",
          (await call(c, "getPullRequest", "getApiV4ProjectsIdMergeRequestsMergeRequestIid", {
            path: { ...path(r), merge_request_iid: n },
          }, o)).body,
        ),
        o,
      ),
    findPullRequest: async (r, i, o) =>
      (await ops.listPullRequests(r, { limit: 1, state: "open", base: i.base, head: i.head, ...o }))
        .items[0],
    isPullRequestMerged: async (r, p, refresh, o) =>
      refresh ? (await ops.getPullRequest(r, p.number, o)).merged : p.merged,
    listPullRequestCommits: (r, p, q) =>
      page(
        c,
        "listPullRequestCommits",
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidCommits",
        { path: { ...path(r), merge_request_iid: p.number } },
        q,
        (p) => commit(c, p),
      ),
    listPullRequestFiles: (r, p, q) =>
      page(
        c,
        "listPullRequestFiles",
        "getApiV4ProjectsIdMergeRequestsMergeRequestIidDiffs",
        { path: { ...path(r), merge_request_iid: p.number } },
        q,
        (p) => file(c, p),
      ),
    createPullRequest: async (r, i, o) => {
      const source = i.source.owner === r.owner && i.source.repository === r.name
        ? r
        : await repository(
          c,
          object(
            c,
            "createPullRequest",
            (await call(c, "createPullRequest", "getApiV4ProjectsId", {
              path: { id: `${i.source.owner}/${i.source.repository}` },
            }, o)).body,
          ),
        );
      return await pullRequest(
        c,
        r,
        object(
          c,
          "createPullRequest",
          (await call(c, "createPullRequest", "postApiV4ProjectsIdMergeRequests", {
            path: path(source),
            body: body({
              title: i.title,
              description: i.description,
              source_branch: i.source.branch,
              target_branch: i.targetBranch,
              target_project_id: numericId(c, "createPullRequest", r.id),
            }),
          }, o)).body,
        ),
        o,
      );
    },
    updatePullRequest: async (r, p, i, o) =>
      pullRequest(
        c,
        r,
        object(
          c,
          "updatePullRequest",
          (await call(c, "updatePullRequest", "putApiV4ProjectsIdMergeRequestsMergeRequestIid", {
            path: { ...path(r), merge_request_iid: p.number },
            body: body({
              title: i.title,
              description: i.description,
              target_branch: i.targetBranch,
            }),
          }, o)).body,
        ),
        o,
      ),
    closePullRequest: async (r, p, o) =>
      pullRequest(
        c,
        r,
        object(
          c,
          "closePullRequest",
          (await call(c, "closePullRequest", "putApiV4ProjectsIdMergeRequestsMergeRequestIid", {
            path: { ...path(r), merge_request_iid: p.number },
            body: body({ state_event: "close" as const }),
          }, o)).body,
        ),
        o,
      ),
    mergePullRequest: async (r, p, o = {}) => {
      const ready = await pollGitLab(c, { universal: "mergePullRequest.readiness" }, {
        attempts: 60,
        intervalMs: 250,
        signal: o.signal,
      }, async () => {
        const v = await ops.getPullRequest(r, p.number, o);
        if (v.mergeable === false || v.state === "closed" && !v.merged) {
          throw new ConflictError("Merge request cannot be merged", context(c, "mergePullRequest"));
        }
        return v.mergeable || v.merged ? v : undefined;
      });
      if (ready.merged) return ready;
      await call(c, "mergePullRequest", "putApiV4ProjectsIdMergeRequestsMergeRequestIidMerge", {
        path: { ...path(r), merge_request_iid: p.number },
        body: body({
          squash: o.method === "squash" ? true : undefined,
          should_remove_source_branch: o.deleteSourceBranch,
          sha: o.extension?.headCommitId ?? p.source.sha,
          merge_commit_message: o.extension?.mergeMessage,
          squash_commit_message: o.extension?.squashMessage,
        }),
      }, o);
      return await pollGitLab(c, { universal: "mergePullRequest" }, {
        attempts: 60,
        intervalMs: 250,
        signal: o.signal,
      }, async () => {
        const value = await ops.getPullRequest(r, p.number, o);
        return value.merged ? value : undefined;
      });
    },
    requestPullRequestReviewers: async (r, p, reviewers, o) => {
      const ids: number[] = [];
      for (const username of reviewers) {
        const users = array(
          c,
          "requestPullRequestReviewers",
          (await extra(
            c,
            "requestPullRequestReviewers",
            "GET",
            "/users",
            { query: { username } },
            o,
          )).body,
        );
        const user = users.find((p) => p.username === username);
        if (!user) invalid(c, "requestPullRequestReviewers", "Reviewer username was not found");
        ids.push(number(c, "requestPullRequestReviewers", user.id));
      }
      await call(
        c,
        "requestPullRequestReviewers",
        "putApiV4ProjectsIdMergeRequestsMergeRequestIid",
        { path: { ...path(r), merge_request_iid: p.number }, body: body({ reviewer_ids: ids }) },
        o,
      );
    },
    approvePullRequest: async (r, p, note, o) => {
      await call(
        c,
        "approvePullRequest",
        "postApiV4ProjectsIdMergeRequestsMergeRequestIidApprove",
        {
          path: { id: numericId(c, "approvePullRequest", r.id), merge_request_iid: p.number },
          body: body({ sha: p.source.sha }),
        },
        o,
      );
      if (note) await ops.publishPullRequestComment(r, p, { body: note }, o);
    },
    publishPullRequestComment: async (r, p, i, o) => {
      if (i.position) {
        const raw = object(
          c,
          "publishPullRequestComment",
          (await call(
            c,
            "publishPullRequestComment",
            "getApiV4ProjectsIdMergeRequestsMergeRequestIid",
            { path: { ...path(r), merge_request_iid: p.number } },
            o,
          )).body,
        );
        const refs = object(c, "publishPullRequestComment", raw.diff_refs);
        // GitLab requires both paths for renamed files, even when only one side is commented on.
        let cursor: string | undefined;
        let selected:
          | Awaited<ReturnType<typeof ops.listPullRequestFiles>>["items"][number]
          | undefined;
        for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
          const files = await ops.listPullRequestFiles(r, p, { limit: 100, cursor, ...o });
          selected = files.items.find((f) =>
            (i.position!.side === "old" ? f.previousPath ?? f.path : f.path) === i.position!.path
          );
          if (selected) break;
          cursor = files.nextCursor;
          if (!cursor) break;
        }
        if (!selected) {
          if (cursor) {
            invalid(
              c,
              "publishPullRequestComment",
              "Inline comment lookup exceeds 1000 diff files",
            );
          }
          throw new NotFoundError(
            "Comment path is not in the merge request diff",
            context(c, "publishPullRequestComment"),
          );
        }
        await extra(
          c,
          "publishPullRequestComment",
          "POST",
          "/projects/{id}/merge_requests/{merge_request_iid}/discussions",
          {
            path: { ...path(r), merge_request_iid: p.number },
            body: body({
              body: i.body,
              position: {
                position_type: "text",
                base_sha: refs.base_sha,
                head_sha: refs.head_sha,
                start_sha: refs.start_sha,
                old_path: selected.previousPath ?? selected.path,
                new_path: selected.path,
                ...(i.position.side === "old"
                  ? { old_line: i.position.line }
                  : { new_line: i.position.line }),
              },
            }),
          },
          o,
        );
      } else {
        await extra(
          c,
          "publishPullRequestComment",
          "POST",
          "/projects/{id}/merge_requests/{merge_request_iid}/notes",
          { path: { ...path(r), merge_request_iid: p.number }, body: body({ body: i.body }) },
          o,
        );
      }
    },
  };
  return ops;
}
