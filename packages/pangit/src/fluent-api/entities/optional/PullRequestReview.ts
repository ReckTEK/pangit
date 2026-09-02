import type { ProviderVersion } from "../../../generated-rest-clients/git-host.ts";
import type {
  ProviderPullRequestReviewNative,
  PullRequestReviewData,
  PullRequestReviewState,
} from "../../adapter-contract/optional/pull-request-reviews.ts";
import type { FluentProvider } from "../../provider-registry.ts";

export interface PullRequestReview<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
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
  readonly native: ProviderPullRequestReviewNative<TProvider, TVersion>;
}

export function createPullRequestReview<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(data: PullRequestReviewData<TProvider, TVersion>): PullRequestReview<TProvider, TVersion> {
  return Object.freeze({ ...data, native: data.native });
}
