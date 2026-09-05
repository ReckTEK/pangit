import {
  createForgejoBranch,
  deleteForgejoBranch,
  renameForgejoBranch,
} from "./mutate-branches.ts";

import { forgejoBranchExists, getForgejoBranch, listForgejoBranches } from "./read-branches.ts";
import { getForgejoBranchDivergence, listForgejoBranchDivergences } from "./divergence.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
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
    listBranches: (repository, request) => listForgejoBranches(context, repository, request),
    getBranch: (repository, name, options) => getForgejoBranch(context, repository, name, options),
    branchExists: (repository, name, options) =>
      forgejoBranchExists(context, repository, name, options),
    createBranch: (repository, input, options) =>
      createForgejoBranch(context, repository, input, options),
    renameBranch: (repository, branch, name, options) =>
      renameForgejoBranch(context, repository, branch, name, options),
    deleteBranch: (repository, branch, options) =>
      deleteForgejoBranch(context, repository, branch, options),
    getDivergence: (repository, base, head, options) =>
      getForgejoBranchDivergence(context, repository, base, head, options),
    listBranchDivergences: (repository, request) =>
      listForgejoBranchDivergences(context, repository, request),
  };
}
