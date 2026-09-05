import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  PullRequestReviewData,
  PullRequestReviewState,
} from "../../../fluent-api/adapter-contract/optional/pull-request-reviews.ts";

import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoPullRequestReviewNative,
  type ForgejoPullRequestReviewPayload,
} from "../native/ForgejoPullRequestReviewNative.ts";

import { type AnyForgejoReview, optionalText, requiredPositiveId } from "./validate-payload.ts";

export function normalizeForgejoPullRequestReview<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  payload: AnyForgejoReview,
): PullRequestReviewData<"forgejo", TVersion, ForgejoProviderTypes> {
  const id = requiredPositiveId(payload.id, "pull-request review id");
  const providerState = optionalText(payload.state);
  return Object.freeze({
    id,
    state: payload.dismissed === true ? "dismissed" : normalizedReviewState(providerState),
    ...(providerState === undefined ? {} : { providerState }),
    ...(optionalText(payload.body) === undefined ? {} : { body: optionalText(payload.body) }),
    ...(optionalText(payload.commit_id) === undefined
      ? {}
      : { commitSha: optionalText(payload.commit_id) }),
    ...(optionalText(payload.user?.login) === undefined
      ? {}
      : { author: optionalText(payload.user?.login) }),
    ...(optionalText(payload.submitted_at) === undefined
      ? {}
      : { submittedAt: optionalText(payload.submitted_at) }),
    ...(optionalText(payload.updated_at) === undefined
      ? {}
      : { updatedAt: optionalText(payload.updated_at) }),
    ...(optionalText(payload.html_url) === undefined
      ? {}
      : { url: optionalText(payload.html_url) }),
    native: createForgejoPullRequestReviewNative(
      client,
      payload as ForgejoPullRequestReviewPayload<TVersion>,
    ),
  });
}

function normalizedReviewState(value?: string): PullRequestReviewState {
  switch (value) {
    case "PENDING":
      return "pending";
    case "APPROVED":
      return "approved";
    case "REQUEST_CHANGES":
      return "changes-requested";
    case "COMMENT":
      return "commented";
    case "REQUEST_REVIEW":
      return "review-requested";
    default:
      return "unknown";
  }
}
