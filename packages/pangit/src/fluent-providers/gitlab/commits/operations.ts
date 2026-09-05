import { aggregateContributors } from "../../../fluent-api/adapter-contract/contributor-aggregation.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type {
  CommitData,
  CommitFacets,
  CommitFileData,
  MergeBaseOptions,
} from "../../../fluent-api/adapter-contract/commits.ts";
import { IncompleteHistoryError } from "../../../fluent-api/adapter-contract/errors.ts";
import { createPage } from "../../../fluent-api/adapter-contract/pagination.ts";
import {
  array,
  batch,
  call,
  context,
  type Dto,
  id,
  invalid,
  invariant,
  number,
  object,
  optional,
  page,
  path,
  required,
  text,
} from "../transport/mod.ts";
import type { Adapter, Repo } from "../adapter.ts";
import { door } from "../native/door.ts";

export function file(c: GitLabAdapterContext<GitLabVersion>, p: Dto): CommitFileData {
  return Object.freeze({
    path: required(c, "normalizeCommitFile", p.new_path),
    previousPath: p.renamed_file ? text(p.old_path) : undefined,
    status: p.new_file
      ? "added"
      : p.deleted_file
      ? "removed"
      : p.renamed_file
      ? "renamed"
      : "modified",
  });
}
export async function commit<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
  facets: CommitFacets = {},
): Promise<CommitData<"gitlab", V>> {
  const stats = p.stats ? object(c, "normalizeCommit", p.stats) : undefined;
  if (!Array.isArray(p.parent_ids) || !p.parent_ids.every((x) => typeof x === "string")) {
    invariant(c, "normalizeCommit", "Commit parents are missing");
  }
  return Object.freeze({
    sha: id(c, "normalizeCommit", p.id),
    message: required(c, "normalizeCommit", p.message),
    url: text(p.web_url),
    author: { name: text(p.author_name), email: text(p.author_email), date: text(p.authored_date) },
    committer: {
      name: text(p.committer_name),
      email: text(p.committer_email),
      date: text(p.committed_date),
    },
    parents: Object.freeze([...p.parent_ids] as string[]),
    ...(facets.stats && stats
      ? {
        additions: number(c, "normalizeCommit", stats.additions),
        deletions: number(c, "normalizeCommit", stats.deletions),
      }
      : {}),
    native: await door(c, "commit", p),
  });
}
export async function comparison<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  base: string,
  head: string,
  options: { signal?: AbortSignal } = {},
) {
  const p = object(
    c,
    "compareCommits",
    (await call(c, "compareCommits", "getApiV4ProjectsIdRepositoryCompare", {
      path: path(r),
      query: { from: base, to: head, straight: true },
    }, options)).body,
  );
  if (p.compare_timeout === true) {
    throw new IncompleteHistoryError("GitLab comparison timed out", context(c, "compareCommits"));
  }
  const values = array(c, "compareCommits", p.commits);
  return Object.freeze({
    commits: Object.freeze(await Promise.all(values.map((p) => commit(c, p)))),
    totalCommits: values.length,
  });
}
export function commits<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  const ops: Pick<
    Adapter<V>,
    | "listCommits"
    | "getCommit"
    | "getCommits"
    | "compareCommits"
    | "listCommitFiles"
    | "findMergeBases"
    | "countReachableCommits"
    | "findRefsForCommit"
    | "listContributors"
  > = {
    listCommits: (r, q) =>
      page(
        c,
        "listCommits",
        "getApiV4ProjectsIdRepositoryCommits",
        {
          path: path(r),
          query: {
            ref_name: q.excluding ? `${q.excluding}..${q.ref ?? r.defaultBranch ?? "HEAD"}` : q.ref,
            since: q.since,
            until: q.until,
            with_stats: q.stats,
          },
        },
        q,
        async (p, signal) => {
          const normalized = await commit(c, p, q);
          return q.files || q.verification
            ? await ops.getCommit(r, normalized.sha, { ...q, signal })
            : normalized;
        },
      ),
    getCommit: async (r, sha, o = {}) => {
      const p = object(
        c,
        "getCommit",
        (await call(c, "getCommit", "getApiV4ProjectsIdRepositoryCommitsSha", {
          path: { ...path(r), sha },
          query: { stats: o.stats ?? false },
        }, o)).body,
      );
      const normalized = await commit(c, p, o);
      const files = o.files ? await ops.listCommitFiles(r, normalized.sha, o) : undefined;
      let verified: boolean | undefined;
      if (o.verification) {
        const signature = await optional(() =>
          call(c, "getCommit.verification", "getApiV4ProjectsIdRepositoryCommitsShaSignature", {
            path: { ...path(r), sha: normalized.sha },
          }, o)
        );
        verified = signature
          ? object(c, "getCommit.verification", signature.body).verification_status === "verified"
          : false;
      }
      return Object.freeze({
        ...normalized,
        ...(files ? { files, changedFiles: files.length } : {}),
        ...(verified === undefined ? {} : { verified }),
      });
    },
    getCommits: async (r, shas, o = {}) => {
      if (shas.length > (o.maxItems ?? 100)) invalid(c, "getCommits", "Batch exceeds maxItems");
      const unique = [...new Set(shas)];
      const values = await batch(
        c,
        "getCommits",
        unique,
        o,
        100,
        (sha, signal) => ops.getCommit(r, sha, { ...o, signal }),
      );
      const map = new Map(unique.map((sha, i) => [sha, values[i]]));
      return Object.freeze(shas.map((sha) => map.get(sha)!));
    },
    compareCommits: (r, base, head, o) => comparison(c, r, base, head, o),
    listCommitFiles: async (r, sha, o = {}) => {
      const files: CommitFileData[] = [];
      const seen = new Set<string>();
      let cursor: string | undefined;
      do {
        const result = await page(
          c,
          "listCommitFiles",
          "getApiV4ProjectsIdRepositoryCommitsShaDiff",
          { path: { ...path(r), sha } },
          { limit: 100, ...o, cursor },
          // These records retain filenames even when GitLab omits large diff bodies.
          (p) => file(c, p),
        );
        files.push(...result.items);
        cursor = result.nextCursor;
        if (cursor && seen.has(cursor)) {
          invariant(c, "listCommitFiles", "GitLab repeated a commit-file continuation cursor");
        }
        if (cursor) seen.add(cursor);
      } while (cursor);
      return Object.freeze(files);
    },
    findMergeBases: (r, left, right, o) => mergeBases(c, r, left, right, o, ops.getCommit),
    countReachableCommits: async (r, include, exclude, o) => {
      if (exclude) return (await comparison(c, r, exclude, include, o)).commits.length;
      const p = object(
        c,
        "countReachableCommits",
        (await call(c, "countReachableCommits", "getApiV4ProjectsIdRepositoryCommitsShaSequence", {
          path: { ...path(r), sha: include },
        }, o)).body,
      );
      return number(c, "countReachableCommits", p.count);
    },
    findRefsForCommit: async (r, sha, q) => {
      const kind = q.kinds.length === 1 ? q.kinds[0] : "all";
      const result = await page(
        c,
        "findRefsForCommit",
        "getApiV4ProjectsIdRepositoryCommitsShaRefs",
        { path: { ...path(r), sha }, query: { type: kind } },
        q,
        async (p, signal) => {
          const name = required(c, "findRefsForCommit", p.name);
          const k = p.type === "tag" ? "tag" as const : "branch" as const;
          const raw = object(
            c,
            "findRefsForCommit",
            (await (k === "tag"
              ? call(c, "findRefsForCommit", "getApiV4ProjectsIdRepositoryTagsTagName", {
                path: { ...path(r), tag_name: name },
              }, { ...q, signal })
              : call(c, "findRefsForCommit", "getApiV4ProjectsIdRepositoryBranchesBranch", {
                path: { id: r.id, branch: name },
              }, { ...q, signal }))).body,
          );
          const head = id(c, "findRefsForCommit", object(c, "findRefsForCommit", raw.commit).id);
          return Object.freeze({ kind: k, name, sha: head });
        },
      );
      return createPage(
        result.items.filter((p) =>
          q.kinds.includes(p.kind) && (q.match === "contains" || p.sha === sha)
        ),
        result,
      );
    },
    listContributors: async (r, q) => {
      if (q.maxItems === undefined && q.since === undefined && q.until === undefined) {
        invalid(c, "listContributors", "Contributors require a history bound");
      }
      const result = await ops.listCommits(r, {
        ...q,
        limit: Math.min(q.limit, q.maxItems ?? q.limit),
      });
      return Object.freeze({
        ...createPage(aggregateContributors(result.items), result),
        complete: !result.nextCursor,
      });
    },
  };
  return ops;
}
/** Traverse both complete ancestry graphs; never claim all merge bases from GitLab's single-base endpoint. */
async function mergeBases<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  left: string,
  right: string,
  o: MergeBaseOptions,
  get: Adapter<V>["getCommit"],
) {
  const loaded = new Map<string, CommitData<"gitlab", V>>();
  const unique = new Set<string>();
  let requests = 0;
  const read = async (sha: string) => {
    if (loaded.has(sha)) return loaded.get(sha)!;
    if (requests >= o.maxRequests || unique.size >= o.maxItems) {
      throw new IncompleteHistoryError(
        "Merge-base traversal exceeded its caller bounds",
        context(c, "findMergeBases"),
      );
    }
    requests++;
    const value = await get(r, sha, o);
    unique.add(value.sha);
    loaded.set(sha, value);
    loaded.set(value.sha, value);
    return value;
  };
  const walk = async (ref: string) => {
    const seen = new Set<string>();
    const queue = [ref];
    while (queue.length) {
      const value = await read(queue.shift()!);
      if (seen.has(value.sha)) continue;
      seen.add(value.sha);
      queue.push(...value.parents);
    }
    return seen;
  };
  const a = await walk(left), b = await walk(right);
  const common = new Set([...a].filter((sha) => b.has(sha)));
  const ancestors = new Set<string>();
  for (const sha of common) {
    const stack = [...loaded.get(sha)!.parents];
    while (stack.length) {
      const parent = stack.pop()!;
      if (ancestors.has(parent)) continue;
      ancestors.add(parent);
      stack.push(...loaded.get(parent)!.parents);
    }
  }
  return Object.freeze({
    commits: Object.freeze(
      [...common].filter((sha) => !ancestors.has(sha)).map((sha) => loaded.get(sha)!),
    ),
    complete: true as const,
  });
}
