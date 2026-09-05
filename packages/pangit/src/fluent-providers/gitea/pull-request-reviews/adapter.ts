import type {} from "../registration.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { createGiteaPullRequestReview, submitGiteaPullRequestReview } from "./write-reviews.ts";
import { getGiteaPullRequestReview, listGiteaPullRequestReviews } from "./read-reviews.ts";
import { giteaPullRequestReviewSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "pullRequestReviewSupport"
  | "listPullRequestReviews"
  | "getPullRequestReview"
  | "createPullRequestReview"
  | "submitPullRequestReview"
> {
  return {
    pullRequestReviewSupport: giteaPullRequestReviewSupport,
    listPullRequestReviews: (
      repository,
      pullRequest,
      request,
    ) => listGiteaPullRequestReviews(context, repository, pullRequest, request),
    getPullRequestReview: (
      repository,
      pullRequest,
      id,
      options,
    ) => getGiteaPullRequestReview(context, repository, pullRequest, id, options),
    createPullRequestReview: (
      repository,
      pullRequest,
      input,
      options,
    ) => createGiteaPullRequestReview(context, repository, pullRequest, input, options),
    submitPullRequestReview: (
      repository,
      pullRequest,
      review,
      input,
      options,
    ) => submitGiteaPullRequestReview(context, repository, pullRequest, review, input, options),
  };
}
