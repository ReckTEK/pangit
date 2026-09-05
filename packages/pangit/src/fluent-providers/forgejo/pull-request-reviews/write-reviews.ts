import type {
  CreatePullRequestReviewInput,
  CreatePullRequestReviewOptions,
  PullRequestReviewData,
  SubmitPullRequestReviewEvent,
  SubmitPullRequestReviewInput,
} from "../../../fluent-api/adapter-contract/optional/pull-request-reviews.ts";
import type {
  ForgejoCreatePullRequestReviewExtension,
  ForgejoPullRequestReviewEvent,
} from "../extensions/pull-request-reviews.ts";

import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import {
  type AnyForgejoReview,
  isReviewPayload,
  parsePositiveInt64,
  pullRequestNumber,
} from "./validate-payload.ts";

import { normalizeForgejoPullRequestReview } from "./normalize.ts";

/** Create one pending review without provider-specific inline positions. */
export async function createForgejoPullRequestReview<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  pullRequest: PullRequestData<"forgejo", TVersion>,
  input: CreatePullRequestReviewInput,
  options: CreatePullRequestReviewOptions<"forgejo"> = {},
): Promise<PullRequestReviewData<"forgejo", TVersion>> {
  const operation = {
    universal: "createPullRequestReview",
    native: "repoCreatePullReview",
  } as const;
  const extension = options.extension as ForgejoCreatePullRequestReviewExtension | undefined;
  const comments = extension?.comments?.map((comment, index) => {
    const oldPosition = comment.oldPosition === undefined
      ? undefined
      : requirePositiveInteger(comment.oldPosition, `review comment ${index} old position`);
    const newPosition = comment.newPosition === undefined
      ? undefined
      : requirePositiveInteger(comment.newPosition, `review comment ${index} new position`);
    if (oldPosition === undefined && newPosition === undefined) {
      throw new TypeError(`review comment ${index} requires an old or new position`);
    }
    return {
      body: requireIdentity(comment.body, `review comment ${index} body`),
      path: requireIdentity(comment.path, `review comment ${index} path`),
      ...(oldPosition === undefined ? {} : { old_position: oldPosition }),
      ...(newPosition === undefined ? {} : { new_position: newPosition }),
    };
  });
  if (comments !== undefined && comments.length === 0) {
    throw new RangeError("Forgejo review comments cannot be empty");
  }
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoReview, TVersion>(
    context,
    operation,
    () =>
      client.repoCreatePullReview(
        {
          path: { ...repositoryPath(repository), index: pullRequestNumber(pullRequest) },
          body: {
            mediaType: "application/json",
            value: {
              event: forgejoReviewEvent(extension?.event ?? "pending"),
              ...(input.body === undefined
                ? {}
                : { body: requireIdentity(input.body, "review body") }),
              ...(input.commitSha === undefined
                ? {}
                : { commit_id: requireIdentity(input.commitSha, "review commit SHA") }),
              ...(comments === undefined ? {} : { comments }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReviewPayload,
  );
  return normalizeForgejoPullRequestReview(client, payload);
}

/** Submit one known pending review directly. */
export async function submitForgejoPullRequestReview<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  pullRequest: PullRequestData<"forgejo", TVersion>,
  review: PullRequestReviewData<"forgejo", TVersion>,
  input: SubmitPullRequestReviewInput,
  options: OperationOptions = {},
): Promise<PullRequestReviewData<"forgejo", TVersion>> {
  const operation = {
    universal: "submitPullRequestReview",
    native: "repoSubmitPullReview",
  } as const;
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoReview, TVersion>(
    context,
    operation,
    () =>
      client.repoSubmitPullReview(
        {
          path: {
            ...repositoryPath(repository),
            index: pullRequestNumber(pullRequest),
            id: parsePositiveInt64(review.id, "pull-request review id"),
          },
          body: {
            mediaType: "application/json",
            value: {
              event: forgejoReviewEvent(input.event),
              ...(input.body === undefined
                ? {}
                : { body: requireIdentity(input.body, "review body") }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isReviewPayload,
  );
  return normalizeForgejoPullRequestReview(client, payload);
}

function forgejoReviewEvent(value: SubmitPullRequestReviewEvent | ForgejoPullRequestReviewEvent) {
  switch (value) {
    case "approve":
      return "APPROVED" as const;
    case "request-changes":
      return "REQUEST_CHANGES" as const;
    case "comment":
      return "COMMENT" as const;
    case "pending":
      return "PENDING" as const;
    case "request-review":
      return "REQUEST_REVIEW" as const;
    default:
      throw new TypeError("invalid pull-request review event");
  }
}
