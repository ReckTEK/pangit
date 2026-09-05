import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { approveForgejoPullRequest } from "./approve-pull-request.ts";
import { closeForgejoPullRequest, updateForgejoPullRequest } from "./update-pull-request.ts";
import { createForgejoPullRequest } from "./create-pull-request.ts";
import {
  findForgejoPullRequest,
  getForgejoPullRequest,
  isForgejoPullRequestMerged,
} from "./get-pull-request.ts";

import { listForgejoPullRequestCommits } from "./list-commits.ts";
import { listForgejoPullRequestFiles } from "./list-files.ts";
import { listForgejoPullRequests } from "./list-pull-requests.ts";
import { mergeForgejoPullRequest } from "./merge-pull-request.ts";
import { publishForgejoPullRequestComment } from "./publish-comment.ts";
import { requestForgejoPullRequestReviewers } from "./request-reviewers.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<
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
> {
  return {
    listPullRequests: (repository, request) =>
      listForgejoPullRequests(context, repository, request),
    getPullRequest: (repository, number, options) =>
      getForgejoPullRequest(context, repository, number, options),
    findPullRequest: (repository, input, options) =>
      findForgejoPullRequest(context, repository, input, options),
    isPullRequestMerged: (
      repository,
      pullRequest,
      refresh,
      options,
    ) => isForgejoPullRequestMerged(context, repository, pullRequest, refresh, options),
    listPullRequestCommits: (
      repository,
      pullRequest,
      request,
    ) => listForgejoPullRequestCommits(context, repository, pullRequest, request),
    listPullRequestFiles: (
      repository,
      pullRequest,
      request,
    ) => listForgejoPullRequestFiles(context, repository, pullRequest, request),
    createPullRequest: (repository, input, options) =>
      createForgejoPullRequest(context, repository, input, options),
    updatePullRequest: (
      repository,
      pullRequest,
      input,
      options,
    ) => updateForgejoPullRequest(context, repository, pullRequest, input, options),
    closePullRequest: (
      repository,
      pullRequest,
      options,
    ) => closeForgejoPullRequest(context, repository, pullRequest, options),
    mergePullRequest: (
      repository,
      pullRequest,
      options,
    ) => mergeForgejoPullRequest(context, repository, pullRequest, options),
    requestPullRequestReviewers: (
      repository,
      pullRequest,
      reviewers,
      options,
    ) =>
      requestForgejoPullRequestReviewers(
        context,
        repository,
        pullRequest,
        reviewers,
        options,
      ),
    approvePullRequest: (
      repository,
      pullRequest,
      body,
      options,
    ) => approveForgejoPullRequest(context, repository, pullRequest, body, options),
    publishPullRequestComment: (
      repository,
      pullRequest,
      input,
      options,
    ) => publishForgejoPullRequestComment(context, repository, pullRequest, input, options),
  };
}
