import type { PullRequestReviewCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/pull-request-reviews.ts";

export const forgejoPullRequestReviewSupport = Object.freeze({
  supported: true,
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
}) satisfies PullRequestReviewCapabilitySupport;
