import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";
import type { BranchData } from "../../fluent-api/adapter-contract/branches.ts";
import type { TagData } from "../../fluent-api/adapter-contract/tags.ts";
import { createPage } from "../../fluent-api/adapter-contract/pagination.ts";
import {
  type Adapter,
  batch,
  body,
  call,
  door,
  type Dto,
  id,
  object,
  optional,
  page,
  path,
  required,
  text,
  unavailable,
} from "./shared.ts";
import { comparison } from "./commits.ts";
export async function branch<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<BranchData<"gitlab", V>> {
  return Object.freeze({
    name: required(c, "normalizeBranch", p.name),
    sha: id(c, "normalizeBranch", object(c, "normalizeBranch", p.commit).id),
    // GL-001: the server's cached flag can contradict configured rules and actual intent.
    // Preserve it only in the native payload until a fixed GitLab version is supported.
    native: await door(c, "branch", p),
  });
}
async function tag<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<TagData<"gitlab", V>> {
  return Object.freeze({
    name: required(c, "normalizeTag", p.name),
    sha: id(c, "normalizeTag", object(c, "normalizeTag", p.commit).id),
    message: text(p.message),
    annotated: p.message !== null && typeof p.message === "string",
    native: await door(c, "tag", p),
  });
}
export function branchesTags<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
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
    | "listTags"
    | "getTag"
    | "createTag"
    | "deleteTag"
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
        async (b) =>
          Object.freeze({ branch: b, divergence: await ops.getDivergence(r, q.base, b.sha, q) }),
      );
      return createPage(values, p);
    },
    listTags: (r, q) =>
      page(
        c,
        "listTags",
        "getApiV4ProjectsIdRepositoryTags",
        { path: path(r) },
        q,
        (p) => tag(c, p),
      ),
    getTag: async (r, name, o) =>
      tag(
        c,
        object(
          c,
          "getTag",
          (await call(c, "getTag", "getApiV4ProjectsIdRepositoryTagsTagName", {
            path: { ...path(r), tag_name: name },
          }, o)).body,
        ),
      ),
    createTag: async (r, i, o) =>
      tag(
        c,
        object(
          c,
          "createTag",
          (await call(c, "createTag", "postApiV4ProjectsIdRepositoryTags", {
            path: path(r),
            body: body({ tag_name: i.name, ref: i.target, message: i.message }),
          }, o)).body,
        ),
      ),
    deleteTag: async (r, t, o) => {
      await call(c, "deleteTag", "deleteApiV4ProjectsIdRepositoryTagsTagName", {
        path: { ...path(r), tag_name: t.name },
      }, o);
    },
  };
  return ops;
}
