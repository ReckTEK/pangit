import type { PullReview as PullReview126 } from "../../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type { PullReview as PullReview127 } from "../../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { GiteaClient, GiteaVersion } from "./GiteaEntityNative.ts";

/** Exact generated review payload selected by the configured Gitea version. */
export type GiteaPullRequestReviewPayload<TVersion extends GiteaVersion> = TVersion extends "1.26.4"
  ? PullReview126
  : PullReview127;

export type GiteaPullRequestReviewNativeContext<TVersion extends GiteaVersion> = Readonly<{
  client: GiteaClient<TVersion>;
  review: GiteaPullRequestReviewPayload<TVersion>;
}>;

/** Exact native door retained by one optional submitted-review object. */
export interface GiteaPullRequestReviewNative<TVersion extends GiteaVersion> {
  gitea<TResult>(
    use: (
      context: GiteaPullRequestReviewNativeContext<TVersion>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createGiteaPullRequestReviewNative<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  review: GiteaPullRequestReviewPayload<TVersion>,
): GiteaPullRequestReviewNative<TVersion> {
  const context = Object.freeze({ client, review });
  return Object.freeze({
    async gitea<TResult>(
      use: (
        value: GiteaPullRequestReviewNativeContext<TVersion>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
