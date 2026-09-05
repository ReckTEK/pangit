import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { unavailable } from "../transport/mod.ts";
import type { Adapter } from "../adapter.ts";

export function pullRequestReviews<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "pullRequestReviewSupport"
  | "listPullRequestReviews"
  | "getPullRequestReview"
  | "createPullRequestReview"
  | "submitPullRequestReview"
> {
  const ops: Pick<
    Adapter<V>,
    | "pullRequestReviewSupport"
    | "listPullRequestReviews"
    | "getPullRequestReview"
    | "createPullRequestReview"
    | "submitPullRequestReview"
  > = {
    pullRequestReviewSupport: Object.freeze({
      supported: false,
      operations: Object.freeze({
        list: "one-page",
        get: "direct",
        create: "direct",
        submit: "direct",
      }),
      dismissal: "provider-extension-or-native",
      replies: "provider-extension-or-native",
      resolution: "provider-extension-or-native",
      richPositions: "provider-extension-or-native",
    }),
    listPullRequestReviews: () =>
      unavailable(
        c,
        "listPullRequestReviews",
        "GitLab exposes draft notes and approvals, not persistent review objects; use native access",
      ),
    getPullRequestReview: () =>
      unavailable(
        c,
        "getPullRequestReview",
        "GitLab has no stable pending/submitted review-object identity",
      ),
    createPullRequestReview: () =>
      unavailable(
        c,
        "createPullRequestReview",
        "Use GitLab's native draft-note API or core comments and approvals",
      ),
    submitPullRequestReview: () =>
      unavailable(
        c,
        "submitPullRequestReview",
        "GitLab draft notes and approvals cannot preserve the portable review identity",
      ),
  };
  return ops;
}
