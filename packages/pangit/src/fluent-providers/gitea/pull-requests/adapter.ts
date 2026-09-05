import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { approveGiteaPullRequest } from "./approve-pull-request.ts";
import { closeGiteaPullRequest, updateGiteaPullRequest } from "./update-pull-request.ts";
import { createGiteaPullRequest } from "./create-pull-request.ts";
import {
  findGiteaPullRequest,
  getGiteaPullRequest,
  isGiteaPullRequestMerged,
} from "./get-pull-request.ts";

import { listGiteaPullRequestCommits } from "./list-commits.ts";
import { listGiteaPullRequestFiles } from "./list-files.ts";
import { listGiteaPullRequests } from "./list-pull-requests.ts";
import { mergeGiteaPullRequest } from "./merge-pull-request.ts";
import { publishGiteaPullRequestComment } from "./publish-comment.ts";
import { requestGiteaPullRequestReviewers } from "./request-reviewers.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
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
    listPullRequests: (repository, request) => listGiteaPullRequests(context, repository, request),
    getPullRequest: (repository, number, options) =>
      getGiteaPullRequest(context, repository, number, options),
    findPullRequest: (repository, input, options) =>
      findGiteaPullRequest(context, repository, input, options),
    isPullRequestMerged: (
      repository,
      pullRequest,
      refresh,
      options,
    ) => isGiteaPullRequestMerged(context, repository, pullRequest, refresh, options),
    listPullRequestCommits: (
      repository,
      pullRequest,
      request,
    ) => listGiteaPullRequestCommits(context, repository, pullRequest, request),
    listPullRequestFiles: (
      repository,
      pullRequest,
      request,
    ) => listGiteaPullRequestFiles(context, repository, pullRequest, request),
    createPullRequest: (repository, input, options) =>
      createGiteaPullRequest(context, repository, input, options),
    updatePullRequest: (
      repository,
      pullRequest,
      input,
      options,
    ) => updateGiteaPullRequest(context, repository, pullRequest, input, options),
    closePullRequest: (
      repository,
      pullRequest,
      options,
    ) => closeGiteaPullRequest(context, repository, pullRequest, options),
    mergePullRequest: (
      repository,
      pullRequest,
      options,
    ) => mergeGiteaPullRequest(context, repository, pullRequest, options),
    requestPullRequestReviewers: (
      repository,
      pullRequest,
      reviewers,
      options,
    ) =>
      requestGiteaPullRequestReviewers(
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
    ) => approveGiteaPullRequest(context, repository, pullRequest, body, options),
    publishPullRequestComment: (
      repository,
      pullRequest,
      input,
      options,
    ) => publishGiteaPullRequestComment(context, repository, pullRequest, input, options),
  };
}
