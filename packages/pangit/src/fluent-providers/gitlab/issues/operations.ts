import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type {
  IssueCommentData,
  IssueData,
} from "../../../fluent-api/adapter-contract/optional/issues.ts";
import {
  body,
  call,
  type Dto,
  extra,
  extraPage,
  id,
  invalid,
  number,
  object,
  page,
  path,
  required,
  text,
} from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { door } from "../native/door.ts";
async function issue<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<IssueData<"gitlab", V, GitLabProviderTypes>> {
  return Object.freeze({
    id: id(c, "normalizeIssue", p.id),
    number: number(c, "normalizeIssue", p.iid),
    title: required(c, "normalizeIssue", p.title),
    description: text(p.description),
    state: p.state === "opened" ? "open" : "closed",
    author: p.author ? text(object(c, "normalizeIssue", p.author).username) : undefined,
    assignees: Object.freeze(
      Array.isArray(p.assignees)
        ? p.assignees.map((p) =>
          required(c, "normalizeIssue", object(c, "normalizeIssue", p).username)
        )
        : [],
    ),
    labels: Object.freeze(
      Array.isArray(p.labels) ? p.labels.map((p) => required(c, "normalizeIssue", p)) : [],
    ),
    commentCount: typeof p.user_notes_count === "number" ? p.user_notes_count : undefined,
    createdAt: text(p.created_at),
    updatedAt: text(p.updated_at),
    closedAt: text(p.closed_at),
    url: text(p.web_url),
    native: await door(c, "issue", p),
  });
}
async function note<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
  issueNumber?: number,
): Promise<IssueCommentData<"gitlab", V, GitLabProviderTypes>> {
  return Object.freeze({
    id: `${issueNumber ?? number(c, "normalizeIssueComment", p.noteable_iid)}:${
      id(c, "normalizeIssueComment", p.id)
    }`,
    body: required(c, "normalizeIssueComment", p.body),
    author: p.author ? text(object(c, "normalizeIssueComment", p.author).username) : undefined,
    createdAt: text(p.created_at),
    updatedAt: text(p.updated_at),
    native: await door(c, "issueComment", p),
  });
}
export function issues<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const ops: Pick<
    Adapter<V>,
    | "issueSupport"
    | "listIssues"
    | "getIssue"
    | "createIssue"
    | "updateIssue"
    | "setIssueState"
    | "listIssueComments"
    | "getIssueComment"
    | "createIssueComment"
    | "updateIssueComment"
    | "deleteIssueComment"
  > = {
    issueSupport: Object.freeze({
      supported: true,
      operations: Object.freeze({
        list: "one-page",
        get: "direct",
        create: "direct",
        update: "direct",
        "set-state": "direct",
        "list-comments": "one-page-derived",
        "get-comment": "direct",
        "create-comment": "direct",
        "update-comment": "direct",
        "delete-comment": "direct",
      }),
      contentVersionGuard: "unsupported",
      timeTracking: "native-only",
      dependencies: "native-only",
      reactions: "native-only",
      attachments: "native-only",
      watchers: "native-only",
    }),
    listIssues: (r, q) =>
      page(
        c,
        "listIssues",
        "getApiV4ProjectsIdIssues",
        {
          path: path(r),
          query: {
            state: q.state === "open" ? "opened" : q.state,
            search: q.query,
            labels: q.labels ? [...q.labels] : undefined,
          },
        },
        q,
        (p) => issue(c, p),
      ),
    getIssue: async (r, i, o) =>
      issue(
        c,
        object(
          c,
          "getIssue",
          (await call(c, "getIssue", "getApiV4ProjectsIdIssuesIssueIid", {
            path: { ...path(r), issue_iid: i },
          }, o)).body,
        ),
      ),
    createIssue: async (r, i, o) =>
      issue(
        c,
        object(
          c,
          "createIssue",
          (await call(c, "createIssue", "postApiV4ProjectsIdIssues", {
            path: path(r),
            body: body({ title: i.title, description: i.description }),
          }, o)).body,
        ),
      ),
    updateIssue: async (r, i, update, o) =>
      issue(
        c,
        object(
          c,
          "updateIssue",
          (await call(c, "updateIssue", "putApiV4ProjectsIdIssuesIssueIid", {
            path: { ...path(r), issue_iid: i.number },
            body: body({ title: update.title, description: update.description }),
          }, o)).body,
        ),
      ),
    setIssueState: async (r, i, state, o) =>
      issue(
        c,
        object(
          c,
          "setIssueState",
          (await call(c, "setIssueState", "putApiV4ProjectsIdIssuesIssueIid", {
            path: { ...path(r), issue_iid: i.number },
            body: body({ state_event: state === "open" ? "reopen" as const : "close" as const }),
          }, o)).body,
        ),
      ),
    listIssueComments: async (r, i, q) => {
      const p = await extraPage(
        c,
        "listIssueComments",
        "/projects/{id}/issues/{issue_iid}/notes",
        { path: { ...path(r), issue_iid: i.number } },
        q,
        async (p) => p.system ? undefined : await note(c, p, i.number),
      );
      return Object.freeze({
        ...p,
        items: Object.freeze(p.items.filter((p) => p !== undefined)),
        complete: p.nextCursor === undefined,
      });
    },
    getIssueComment: async (r, n, o) =>
      note(
        c,
        object(
          c,
          "getIssueComment",
          (await extra(
            c,
            "getIssueComment",
            "GET",
            "/projects/{id}/issues/{issue_iid}/notes/{note_id}",
            { path: { ...path(r), ...commentPath(c, n) } },
            o,
          )).body,
        ),
      ),
    createIssueComment: async (r, i, input, o) =>
      note(
        c,
        object(
          c,
          "createIssueComment",
          (await extra(c, "createIssueComment", "POST", "/projects/{id}/issues/{issue_iid}/notes", {
            path: { ...path(r), issue_iid: i.number },
            body: body({ body: input.body }),
          }, o)).body,
        ),
        i.number,
      ),
    updateIssueComment: async (r, n, input, o) =>
      note(
        c,
        object(
          c,
          "updateIssueComment",
          (await extra(
            c,
            "updateIssueComment",
            "PUT",
            "/projects/{id}/issues/{issue_iid}/notes/{note_id}",
            { path: { ...path(r), ...commentPath(c, n.id) }, body: body({ body: input.body }) },
            o,
          )).body,
        ),
      ),
    deleteIssueComment: async (r, n, o) => {
      await extra(
        c,
        "deleteIssueComment",
        "DELETE",
        "/projects/{id}/issues/{issue_iid}/notes/{note_id}",
        { path: { ...path(r), ...commentPath(c, n.id) } },
        o,
      );
    },
  };
  return ops;
}

function commentPath(c: GitLabAdapterContext<GitLabVersion>, value: string) {
  const match = /^(\d+):(\d+)$/.exec(value);
  if (!match) {
    invalid(
      c,
      "issueComments",
      "GitLab comment IDs contain issue IID and note ID separated by a colon",
    );
  }
  return { issue_iid: match[1], note_id: match[2] };
}
