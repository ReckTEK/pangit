import type {} from "../registration.ts";

import { createGiteaBranch, deleteGiteaBranch, renameGiteaBranch } from "./mutate-branches.ts";

import { getGiteaBranch, giteaBranchExists, listGiteaBranches } from "./read-branches.ts";
import { getGiteaBranchDivergence, listGiteaBranchDivergences } from "./divergence.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
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
  return {
    listBranches: (repository, request) => listGiteaBranches(context, repository, request),
    getBranch: (repository, name, options) => getGiteaBranch(context, repository, name, options),
    branchExists: (repository, name, options) =>
      giteaBranchExists(context, repository, name, options),
    createBranch: (repository, input, options) =>
      createGiteaBranch(context, repository, input, options),
    renameBranch: (repository, branch, name, options) =>
      renameGiteaBranch(context, repository, branch, name, options),
    deleteBranch: (repository, branch, options) =>
      deleteGiteaBranch(context, repository, branch, options),
    getDivergence: (repository, base, head, options) =>
      getGiteaBranchDivergence(context, repository, base, head, options),
    listBranchDivergences: (repository, request) =>
      listGiteaBranchDivergences(context, repository, request),
  };
}
