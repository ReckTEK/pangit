import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { createPage } from "../../../fluent-api/adapter-contract/pagination.ts";
import { batch, body, call, object, optional, page, path, unavailable } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";
import { comparison } from "../commits/mod.ts";
import { branch } from "./normalize.ts";

export function branches<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "listBranches"
  | "getBranch"
  | "branchExists"
  | "createBranch"
  | "renameBranch"
  | "deleteBranch"
  | "getDivergence"
  | "listBranchDivergences"
> {
  const ops: Pick<
    Adapter<V>,
    | "listBranches"
    | "getBranch"
    | "branchExists"
    | "createBranch"
    | "renameBranch"
    | "deleteBranch"
    | "getDivergence"
    | "listBranchDivergences"
  > = {
    listBranches: (r, q) =>
      page(
        c,
        "listBranches",
        "getApiV4ProjectsIdRepositoryBranches",
        { path: path(r), query: { search: q.query } },
        q,
        (p) => branch(c, p),
      ),
    getBranch: async (r, name, o) =>
      branch(
        c,
        object(
          c,
          "getBranch",
          (await call(c, "getBranch", "getApiV4ProjectsIdRepositoryBranchesBranch", {
            path: { id: r.id, branch: name },
          }, o)).body,
        ),
      ),
    branchExists: async (r, name, o) =>
      (await optional(() => ops.getBranch(r, name, o))) !== undefined,
    createBranch: async (r, i, o) =>
      branch(
        c,
        object(
          c,
          "createBranch",
          (await call(c, "createBranch", "postApiV4ProjectsIdRepositoryBranches", {
            path: path(r),
            body: body({ branch: i.name, ref: i.source }),
          }, o)).body,
        ),
      ),
    renameBranch: async () => {
      await Promise.resolve();
      unavailable(
        c,
        "renameBranch",
        "GitLab has no atomic branch-rename API; creating and deleting refs could discard concurrent commits",
      );
    },
    deleteBranch: async (r, b, o) => {
      await call(c, "deleteBranch", "deleteApiV4ProjectsIdRepositoryBranchesBranch", {
        path: { ...path(r), branch: b.name },
      }, o);
    },
    getDivergence: async (r, base, head, o) =>
      Object.freeze({
        ahead: (await comparison(c, r, base, head, o)).commits.length,
        behind: (await comparison(c, r, head, base, o)).commits.length,
        complete: true as const,
      }),
    listBranchDivergences: async (r, q) => {
      const p = await ops.listBranches(r, q);
      const values = await batch(
        c,
        "listBranchDivergences",
        p.items,
        q,
        q.limit,
        async (b, signal) =>
          Object.freeze({
            branch: b,
            divergence: await ops.getDivergence(r, q.base, b.sha, { ...q, signal }),
          }),
      );
      return createPage(values, p);
    },
  };
  return ops;
}
