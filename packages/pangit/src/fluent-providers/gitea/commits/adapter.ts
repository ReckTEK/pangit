import type {} from "../registration.ts";

import { compareGiteaCommits } from "./compare-commits.ts";
import { countGiteaReachableCommits } from "./count-reachable.ts";
import { findGiteaMergeBases } from "./find-merge-bases.ts";
import { findGiteaRefsForCommit } from "./find-refs.ts";
import { getGiteaCommit, getGiteaCommits, listGiteaCommits } from "./read-commits.ts";

import { listGiteaCommitFiles } from "./read-files.ts";

import { listGiteaContributors } from "./list-contributors.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
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
    listCommits: (repository, request) => listGiteaCommits(context, repository, request),
    getCommit: (repository, sha, options) => getGiteaCommit(context, repository, sha, options),
    getCommits: (repository, shas, options) => getGiteaCommits(context, repository, shas, options),
    compareCommits: (repository, base, head, options) =>
      compareGiteaCommits(context, repository, base, head, options),
    listCommitFiles: (repository, sha, options) =>
      listGiteaCommitFiles(context, repository, sha, options),
    findMergeBases: (repository, left, right, options) =>
      findGiteaMergeBases(context, repository, left, right, options),
    countReachableCommits: (
      repository,
      include,
      exclude,
      options,
    ) => countGiteaReachableCommits(context, repository, include, exclude, options),
    findRefsForCommit: (repository, sha, request) =>
      findGiteaRefsForCommit(context, repository, sha, request),
    listContributors: (repository, request) => listGiteaContributors(context, repository, request),
  };
}
