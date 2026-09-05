import type {} from "../registration.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { createForgejoPullRequestReview, submitForgejoPullRequestReview } from "./write-reviews.ts";
import { getForgejoPullRequestReview, listForgejoPullRequestReviews } from "./read-reviews.ts";
import { forgejoPullRequestReviewSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "pullRequestReviewSupport"
  | "listPullRequestReviews"
  | "getPullRequestReview"
  | "createPullRequestReview"
  | "submitPullRequestReview"
> {
  return {
    pullRequestReviewSupport: forgejoPullRequestReviewSupport,
    listPullRequestReviews: (
      repository,
      pullRequest,
      request,
    ) => listForgejoPullRequestReviews(context, repository, pullRequest, request),
    getPullRequestReview: (
      repository,
      pullRequest,
      id,
      options,
    ) => getForgejoPullRequestReview(context, repository, pullRequest, id, options),
    createPullRequestReview: (
      repository,
      pullRequest,
      input,
      options,
    ) => createForgejoPullRequestReview(context, repository, pullRequest, input, options),
    submitPullRequestReview: (
      repository,
      pullRequest,
      review,
      input,
      options,
    ) => submitForgejoPullRequestReview(context, repository, pullRequest, review, input, options),
  };
}
