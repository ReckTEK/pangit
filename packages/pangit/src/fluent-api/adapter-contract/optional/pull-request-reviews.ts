import type { ProviderExtensionOptions } from "../../provider-extensions/ProviderExtensionRegistry.ts";
import type { Provider, ProviderVersion } from "../provider.ts";
import type {
  ProviderPullRequestReviewNative,
} from "../../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "../operation-options.ts";
import type { Page, ResolvedPageRequest } from "../pagination.ts";
import type { PullRequestData } from "../pull-requests.ts";
import type { RepositoryData } from "../repositories.ts";

export type {
  ProviderPullRequestReviewNative,
} from "../../native-access/ProviderNativeRegistry.ts";

export type PullRequestReviewState =
  | "pending"
  | "approved"
  | "changes-requested"
  | "commented"
  | "review-requested"
  | "dismissed"
  | "unknown";

/** One provider-normalized pull-request review object. */
export interface PullRequestReviewData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly id: string;
  readonly state: PullRequestReviewState;
  /** Exact provider state, retained even when the shared state is `unknown`. */
  readonly providerState?: string;
  readonly body?: string;
  readonly commitSha?: string;
  readonly author?: string;
  readonly submittedAt?: string;
  readonly updatedAt?: string;
  readonly url?: string;
  readonly native: ProviderPullRequestReviewNative<TProvider, TVersion>;
}

/** Create a pending review. Rich inline positions remain provider-specific. */
export interface CreatePullRequestReviewInput {
  readonly body?: string;
  readonly commitSha?: string;
}

export type CreatePullRequestReviewExtension<TProvider extends Provider> = ProviderExtensionOptions<
  "pullRequestReviews.create",
  TProvider
>;

export interface CreatePullRequestReviewOptions<TProvider extends Provider = Provider>
  extends OperationOptions {
  readonly extension?: CreatePullRequestReviewExtension<TProvider>;
}

export type SubmitPullRequestReviewEvent = "approve" | "request-changes" | "comment";

/** Submit one already-created pending review. */
export interface SubmitPullRequestReviewInput {
  readonly event: SubmitPullRequestReviewEvent;
  readonly body?: string;
}

export type PullRequestReviewOperation = "list" | "get" | "create" | "submit";

export interface PullRequestReviewCapabilitySupport {
  readonly supported: boolean;
  readonly operations: Readonly<
    Record<PullRequestReviewOperation, "direct" | "one-page">
  >;
  readonly dismissal: "provider-extension-or-native";
  readonly replies: "provider-extension-or-native";
  readonly resolution: "provider-extension-or-native";
  readonly richPositions: "provider-extension-or-native";
}

/** Optional submitted-review-object lifecycle, separate from core reviewer actions. */
export interface PullRequestReviewAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly pullRequestReviewSupport: PullRequestReviewCapabilitySupport;
  listPullRequestReviews(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    request: ResolvedPageRequest,
  ): Promise<Page<PullRequestReviewData<TProvider, TVersion>>>;
  getPullRequestReview(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    id: string,
    options?: OperationOptions,
  ): Promise<PullRequestReviewData<TProvider, TVersion>>;
  createPullRequestReview(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    input: CreatePullRequestReviewInput,
    options?: CreatePullRequestReviewOptions<TProvider>,
  ): Promise<PullRequestReviewData<TProvider, TVersion>>;
  submitPullRequestReview(
    repository: RepositoryData<TProvider, TVersion>,
    pullRequest: PullRequestData<TProvider, TVersion>,
    review: PullRequestReviewData<TProvider, TVersion>,
    input: SubmitPullRequestReviewInput,
    options?: OperationOptions,
  ): Promise<PullRequestReviewData<TProvider, TVersion>>;
}
