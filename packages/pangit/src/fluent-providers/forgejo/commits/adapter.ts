import { compareForgejoCommits } from "./compare-commits.ts";
import { countForgejoReachableCommits } from "./count-reachable.ts";
import { findForgejoMergeBases } from "./find-merge-bases.ts";
import { findForgejoRefsForCommit } from "./find-refs.ts";
import { getForgejoCommit, getForgejoCommits, listForgejoCommits } from "./read-commits.ts";

import { listForgejoCommitFiles } from "./read-files.ts";

import { listForgejoContributors } from "./list-contributors.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<
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
> {
  return {
    listCommits: (repository, request) => listForgejoCommits(context, repository, request),
    getCommit: (repository, sha, options) => getForgejoCommit(context, repository, sha, options),
    getCommits: (repository, shas, options) =>
      getForgejoCommits(context, repository, shas, options),
    compareCommits: (repository, base, head, options) =>
      compareForgejoCommits(context, repository, base, head, options),
    listCommitFiles: (repository, sha, options) =>
      listForgejoCommitFiles(context, repository, sha, options),
    findMergeBases: (repository, left, right, options) =>
      findForgejoMergeBases(context, repository, left, right, options),
    countReachableCommits: (
      repository,
      include,
      exclude,
      options,
    ) => countForgejoReachableCommits(context, repository, include, exclude, options),
    findRefsForCommit: (repository, sha, request) =>
      findForgejoRefsForCommit(context, repository, sha, request),
    listContributors: (repository, request) =>
      listForgejoContributors(context, repository, request),
  };
}
