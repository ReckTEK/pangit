import type { ProviderExtensions } from "../../provider-extensions/ExtensionSupport.ts";
import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";
import { ValidationError } from "../../adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../../adapter-contract/pagination.ts";

import type {
  CreatePullRequestReviewInput,
  CreatePullRequestReviewOptions,
  PullRequestReviewAdapter,
  PullRequestReviewCapabilitySupport,
  PullRequestReviewData,
  SubmitPullRequestReviewInput,
} from "../../adapter-contract/optional/pull-request-reviews.ts";
import type { PullRequestData } from "../../adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import type { PullRequest } from "../../entities/PullRequest.ts";
import {
  createPullRequestReview,
  type PullRequestReview,
} from "../../entities/optional/PullRequestReview.ts";

import {
  createOperationExtension,
  type OperationExtension,
} from "../../provider-extensions/OperationExtension.ts";

export type CreatePullRequestReviewOperation<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = OperationExtension<
  "pullRequestReviews.create",
  TProvider,
  TVersion,
  PullRequestReview<TProvider, TVersion>
>;

export interface PullRequestReviews<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly support: PullRequestReviewCapabilitySupport;
  list(request?: PageRequest): Promise<Page<PullRequestReview<TProvider, TVersion>>>;
  get(id: string, options?: OperationOptions): Promise<PullRequestReview<TProvider, TVersion>>;
  create(
    input?: CreatePullRequestReviewInput,
  ): CreatePullRequestReviewOperation<TProvider, TVersion>;
  submit(
    review: PullRequestReview<TProvider, TVersion>,
    input: SubmitPullRequestReviewInput,
    options?: OperationOptions,
  ): Promise<PullRequestReview<TProvider, TVersion>>;
}

export function createPullRequestReviews<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  adapter: PullRequestReviewAdapter<TProvider, TVersion> & {
    readonly extensions: ProviderExtensions<TProvider>;
  },
  repository: RepositoryData<TProvider, TVersion>,
  pullRequest: PullRequest<TProvider, TVersion>,
): PullRequestReviews<TProvider, TVersion> {
  const pullRequestData = (): PullRequestData<TProvider, TVersion> => ({
    ...pullRequest,
    source: { ...pullRequest.source },
    target: { ...pullRequest.target },
    native: pullRequest.native,
  });
  const reviewData = (
    review: PullRequestReview<TProvider, TVersion>,
  ): PullRequestReviewData<TProvider, TVersion> => ({ ...review, native: review.native });
  return Object.freeze({
    support: adapter.pullRequestReviewSupport,
    async list(request: PageRequest = {}) {
      const context = { provider, version, operation: "listPullRequestReviews" } as const;
      if (request.limit !== undefined) {
        requirePositiveInteger(request.limit, "page limit", context);
      }
      const page = await adapter.listPullRequestReviews(
        repository,
        pullRequestData(),
        resolvePageRequest(request, 50, context),
      );
      return createPage(page.items.map(createPullRequestReview), page);
    },
    async get(id: string, options: OperationOptions = {}) {
      const context = { provider, version, operation: "getPullRequestReview" } as const;
      return createPullRequestReview(
        await adapter.getPullRequestReview(
          repository,
          pullRequestData(),
          requireIdentity(id, "pull-request review id", context),
          options,
        ),
      );
    },
    create(input: CreatePullRequestReviewInput = {}) {
      const context = { provider, version, operation: "createPullRequestReview" } as const;
      if (input.body !== undefined) requireIdentity(input.body, "review body", context);
      if (input.commitSha !== undefined) {
        requireIdentity(input.commitSha, "review commit SHA", context);
      }
      return createOperationExtension<
        "pullRequestReviews.create",
        TProvider,
        TVersion,
        PullRequestReview<TProvider, TVersion>
      >({
        operation: "pullRequestReviews.create",
        support: adapter.extensions["pullRequestReviews.create"],
        validationContext: context,
        provider,
        version,
        context: Object.freeze({
          repositoryFullName: repository.fullName,
          pullRequestNumber: pullRequest.number,
          ...(pullRequest.source.sha === undefined ? {} : { sourceSha: pullRequest.source.sha }),
        }),
        execute: async (extension, options) => {
          return createPullRequestReview(
            await adapter.createPullRequestReview(repository, pullRequestData(), input, {
              ...options,
              ...(extension === undefined ? {} : { extension }),
            } as CreatePullRequestReviewOptions<TProvider>),
          );
        },
      });
    },
    async submit(
      review: PullRequestReview<TProvider, TVersion>,
      input: SubmitPullRequestReviewInput,
      options: OperationOptions = {},
    ) {
      const context = { provider, version, operation: "submitPullRequestReview" } as const;
      if (!(["approve", "request-changes", "comment"] as const).includes(input.event)) {
        throw new ValidationError("invalid pull-request review event", context);
      }
      if (input.body !== undefined) requireIdentity(input.body, "review body", context);
      return createPullRequestReview(
        await adapter.submitPullRequestReview(
          repository,
          pullRequestData(),
          reviewData(review),
          input,
          options,
        ),
      );
    },
  });
}
