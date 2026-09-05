import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type {
  CommitFileChangesInput,
  CommitFileChangesOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import { ConflictError } from "../../../fluent-api/adapter-contract/errors.ts";

import {
  batch,
  body,
  call,
  context,
  invalid,
  object,
  optional,
  path,
  text,
  unavailable,
} from "../transport/mod.ts";
import type { Adapter, Repo } from "../adapter.ts";

import { commit } from "../commits/mod.ts";
import { normalizePath } from "./paths.ts";

import { encode } from "./encoding.ts";

export async function commitFiles<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  i: CommitFileChangesInput,
  o: CommitFileChangesOptions<"gitlab"> = {},
) {
  if (i.author?.date !== undefined) {
    unavailable(
      c,
      "commitFileChanges",
      "GitLab does not accept author dates in atomic file commits",
    );
  }
  if (o.extension?.startSha !== undefined && !i.newBranch) {
    invalid(c, "commitFileChanges", "startSha requires newBranch");
  }
  if (o.extension?.startSha !== undefined && !/^[a-f0-9]{40}$/i.test(o.extension.startSha)) {
    invalid(c, "commitFileChanges", "startSha must be a full commit SHA");
  }
  const seen = new Set<string>();
  for (const change of i.changes) {
    normalizePath(c, change.path);
    if (seen.has(change.path)) invalid(c, "commitFileChanges", "Duplicate change path");
    seen.add(change.path);
    if (change.operation === "move") normalizePath(c, change.fromPath);
  }
  // Resolve upserts and optimistic blob preconditions before issuing the single atomic commit.
  const actions = await batch(
    c,
    "commitFileChanges",
    i.changes,
    { maxItems: 100, concurrency: 4 },
    100,
    async (change) => {
      let action = change.operation;
      let last_commit_id: string | undefined;
      if (action === "upsert" || "sha" in change && change.sha !== undefined) {
        const oldPath = change.operation === "move" ? change.fromPath : change.path;
        const response = await optional(() =>
          call(c, "commitFileChanges.preflight", "getApiV4ProjectsIdRepositoryFilesFilePath", {
            path: { ...path(r), file_path: oldPath },
            query: { ref: i.branch },
          }, o)
        );
        const old = response ? object(c, "commitFileChanges", response.body) : undefined;
        if (
          "sha" in change && change.sha !== undefined && old?.blob_id !== change.sha
        ) {
          throw new ConflictError(
            "File changed since the supplied blob SHA",
            context(c, "commitFileChanges"),
          );
        }
        if (action === "upsert") action = old ? "update" : "create";
        last_commit_id = text(old?.last_commit_id);
      }
      return {
        action: action as "create" | "update" | "delete" | "move",
        file_path: change.path,
        ...("content" in change
          ? { content: encode(change.content), encoding: "base64" as const }
          : {}),
        ...(change.operation === "move" ? { previous_path: change.fromPath } : {}),
        ...(last_commit_id ? { last_commit_id } : {}),
      };
    },
  );
  const response = await call(c, "commitFileChanges", "postApiV4ProjectsIdRepositoryCommits", {
    path: path(r),
    body: body({
      branch: i.newBranch ?? i.branch,
      ...(i.newBranch
        ? o.extension?.startSha ? { start_sha: o.extension.startSha } : { start_branch: i.branch }
        : {}),
      force: o.extension?.force,
      commit_message: i.message,
      actions: [...actions],
      author_name: i.author?.name,
      author_email: i.author?.email,
    }),
  }, o);
  return await commit(c, object(c, "commitFileChanges", response.body));
}

export function commitOperations<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<Adapter<V>, "commitFileChanges"> {
  const ops: Pick<Adapter<V>, "commitFileChanges"> = {
    commitFileChanges: (r, i, o) => commitFiles(c, r, i, o),
  };
  return ops;
}
