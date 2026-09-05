import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type {
  ProviderPullRequestReviewNative,
  PullRequestReviewData,
  PullRequestReviewState,
} from "../../adapter-contract/optional/pull-request-reviews.ts";

export interface PullRequestReview<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id: string;
  readonly state: PullRequestReviewState;
  readonly providerState?: string;
  readonly body?: string;
  readonly commitSha?: string;
  readonly author?: string;
  readonly submittedAt?: string;
  readonly updatedAt?: string;
  readonly url?: string;
  readonly native: ProviderPullRequestReviewNative<TProvider, TVersion, TRegistry>;
}

export function createPullRequestReview<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  data: PullRequestReviewData<TProvider, TVersion, TRegistry>,
): PullRequestReview<TProvider, TVersion, TRegistry> {
  return Object.freeze({ ...data, native: data.native });
}
