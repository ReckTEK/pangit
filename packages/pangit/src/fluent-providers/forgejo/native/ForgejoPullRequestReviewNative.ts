import type { PullReview as PullReview15 } from "../../../generated-rest-clients/forgejo/15.0.7/ForgejoRestClient.ts";
import type { PullReview as PullReview16 } from "../../../generated-rest-clients/forgejo/16.0.3/ForgejoRestClient.ts";
import type { ForgejoClient, ForgejoVersion } from "./ForgejoEntityNative.ts";

/** Exact generated review payload selected by the configured Forgejo version. */
export type ForgejoPullRequestReviewPayload<TVersion extends ForgejoVersion> = TVersion extends
  "15.0.7" ? PullReview15
  : PullReview16;

export type ForgejoPullRequestReviewNativeContext<TVersion extends ForgejoVersion> = Readonly<{
  client: ForgejoClient<TVersion>;
  review: ForgejoPullRequestReviewPayload<TVersion>;
}>;

/** Exact native door retained by one optional submitted-review object. */
export interface ForgejoPullRequestReviewNative<TVersion extends ForgejoVersion> {
  forgejo<TResult>(
    use: (
      context: ForgejoPullRequestReviewNativeContext<TVersion>,
    ) => TResult | Promise<TResult>,
  ): Promise<TResult>;
}

export function createForgejoPullRequestReviewNative<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  review: ForgejoPullRequestReviewPayload<TVersion>,
): ForgejoPullRequestReviewNative<TVersion> {
  const context = Object.freeze({ client, review });
  return Object.freeze({
    async forgejo<TResult>(
      use: (
        value: ForgejoPullRequestReviewNativeContext<TVersion>,
      ) => TResult | Promise<TResult>,
    ): Promise<TResult> {
      return await use(context);
    },
  });
}
