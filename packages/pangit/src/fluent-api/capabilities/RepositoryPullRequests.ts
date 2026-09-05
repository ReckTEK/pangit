import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type { CommitFileData } from "../adapter-contract/commits.ts";
import { ValidationError, type ValidationErrorContext } from "../adapter-contract/errors.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../adapter-contract/pagination.ts";

import type {
  CreatePullRequestInput,
  FindPullRequestInput,
  ListPullRequestsRequest,
  MergePullRequestInput,
  MergePullRequestOptions,
  PullRequestCommentInput,
  PullRequestData,
  UpdatePullRequestInput,
} from "../adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../adapter-contract/repositories.ts";
import { type Commit, createCommit } from "../entities/Commit.ts";
import { createPullRequest, type PullRequest } from "../entities/PullRequest.ts";
import {
  createPullRequestReviews,
  type PullRequestReviews,
} from "./optional/PullRequestReviews.ts";

import {
  createOperationExtension,
  type OperationExtension,
} from "../provider-extensions/OperationExtension.ts";

export type MergePullRequestOperation<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = OperationExtension<
  "pullRequests.merge",
  TProvider,
  TVersion,
  PullRequest<TProvider, TVersion, TRegistry>,
  TRegistry
>;

export interface ListPullRequestsOptions
  extends PageRequest, Omit<ListPullRequestsRequest, "limit" | "cursor" | "signal"> {}

export interface RepositoryPullRequests<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  list(
    options?: ListPullRequestsOptions,
  ): Promise<Page<PullRequest<TProvider, TVersion, TRegistry>>>;
  get(
    number: number,
    options?: OperationOptions,
  ): Promise<PullRequest<TProvider, TVersion, TRegistry>>;
  find(
    input: FindPullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequest<TProvider, TVersion, TRegistry> | undefined>;
  isMerged(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    options?: OperationOptions & { readonly refresh?: boolean },
  ): Promise<boolean>;
  commits(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    request?: PageRequest,
  ): Promise<Page<Commit<TProvider, TVersion, TRegistry>>>;
  files(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    request?: PageRequest,
  ): Promise<Page<Readonly<CommitFileData>>>;
  create(
    input: CreatePullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequest<TProvider, TVersion, TRegistry>>;
  update(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    input: UpdatePullRequestInput,
    options?: OperationOptions,
  ): Promise<PullRequest<TProvider, TVersion, TRegistry>>;
  close(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<PullRequest<TProvider, TVersion, TRegistry>>;
  merge(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    input?: MergePullRequestInput,
  ): MergePullRequestOperation<TProvider, TVersion, TRegistry>;
  requestReviewers(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    reviewers: readonly string[],
    options?: OperationOptions,
  ): Promise<void>;
  approve(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    body?: string,
    options?: OperationOptions,
  ): Promise<void>;
  comment(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
    input: PullRequestCommentInput,
    options?: OperationOptions,
  ): Promise<void>;
  reviews(
    pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
  ): PullRequestReviews<TProvider, TVersion, TRegistry>;
}

export function createRepositoryPullRequests<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
): RepositoryPullRequests<TProvider, TVersion, TRegistry> {
  const data = (
    pull: PullRequest<TProvider, TVersion, TRegistry>,
  ): PullRequestData<TProvider, TVersion, TRegistry> => ({
    ...pull,
    source: { ...pull.source },
    target: { ...pull.target },
    native: pull.native,
  });
  return Object.freeze({
    async list(options: ListPullRequestsOptions = {}) {
      const context = validationContext(adapter, "listPullRequests");
      const page = await adapter.listPullRequests(repository, {
        ...resolvePageRequest(options, 50, context),
        ...(options.state === undefined ? {} : { state: options.state }),
        ...(options.base === undefined
          ? {}
          : { base: requireIdentity(options.base, "pull request base", context) }),
        ...(options.head === undefined
          ? {}
          : { head: requireIdentity(options.head, "pull request head", context) }),
        ...(options.author === undefined
          ? {}
          : { author: requireIdentity(options.author, "pull request author", context) }),
        ...(options.query === undefined
          ? {}
          : { query: requireIdentity(options.query, "pull request query", context) }),
      });
      return createPage(page.items.map(createPullRequest), page);
    },
    async get(number: number, options: OperationOptions = {}) {
      requirePositiveInteger(
        number,
        "pull request number",
        validationContext(adapter, "getPullRequest"),
      );
      return createPullRequest(await adapter.getPullRequest(repository, number, options));
    },
    async find(input: FindPullRequestInput, options: OperationOptions = {}) {
      const context = validationContext(adapter, "findPullRequest");
      requireIdentity(input.base, "pull request base", context);
      requireIdentity(input.head, "pull request head", context);
      const found = await adapter.findPullRequest(repository, input, options);
      return found === undefined ? undefined : createPullRequest(found);
    },
    isMerged(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      options: OperationOptions & { readonly refresh?: boolean } = {},
    ) {
      return adapter.isPullRequestMerged(
        repository,
        data(pullRequest),
        options.refresh ?? false,
        options,
      );
    },
    async commits(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      request: PageRequest = {},
    ) {
      const context = validationContext(adapter, "listPullRequestCommits");
      const page = await adapter.listPullRequestCommits(
        repository,
        data(pullRequest),
        resolvePageRequest(request, 50, context),
      );
      return createPage(page.items.map(createCommit), page);
    },
    async files(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      request: PageRequest = {},
    ) {
      const context = validationContext(adapter, "listPullRequestFiles");
      const page = await adapter.listPullRequestFiles(
        repository,
        data(pullRequest),
        resolvePageRequest(request, 50, context),
      );
      return createPage(page.items.map((file) => Object.freeze({ ...file })), page);
    },
    async create(input: CreatePullRequestInput, options: OperationOptions = {}) {
      const context = validationContext(adapter, "createPullRequest");
      requireIdentity(input.title, "pull request title", context);
      requireIdentity(input.source.owner, "source owner", context);
      requireIdentity(input.source.repository, "source repository", context);
      requireIdentity(input.source.branch, "source branch", context);
      requireIdentity(input.targetBranch, "target branch", context);
      return createPullRequest(await adapter.createPullRequest(repository, input, options));
    },
    async update(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      input: UpdatePullRequestInput,
      options: OperationOptions = {},
    ) {
      const context = validationContext(adapter, "updatePullRequest");
      if (
        input.title === undefined && input.description === undefined &&
        input.targetBranch === undefined
      ) {
        throw new ValidationError("pull-request update cannot be empty", context);
      }
      if (input.title !== undefined) {
        requireIdentity(input.title, "pull request title", context);
      }
      if (input.targetBranch !== undefined) {
        requireIdentity(input.targetBranch, "pull request target branch", context);
      }
      return createPullRequest(
        await adapter.updatePullRequest(repository, data(pullRequest), input, options),
      );
    },
    async close(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      options: OperationOptions = {},
    ) {
      return createPullRequest(
        await adapter.closePullRequest(repository, data(pullRequest), options),
      );
    },
    merge(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      input: MergePullRequestInput = {},
    ) {
      const operationInput = structuredClone(input);
      const context = validationContext(adapter, "mergePullRequest");
      if (
        operationInput.method !== undefined && operationInput.method !== "provider-default" &&
        operationInput.method !== "squash"
      ) {
        throw new ValidationError("invalid pull-request merge method", context);
      }
      return createOperationExtension<
        "pullRequests.merge",
        TProvider,
        TVersion,
        PullRequest<TProvider, TVersion, TRegistry>,
        TRegistry
      >({
        operation: "pullRequests.merge",
        support: adapter.extensions["pullRequests.merge"],
        validationContext: context,
        provider: adapter.provider,
        version: adapter.version,
        context: Object.freeze({
          repositoryFullName: repository.fullName,
          pullRequestNumber: pullRequest.number,
          ...(pullRequest.source.sha === undefined ? {} : { sourceSha: pullRequest.source.sha }),
        }),
        execute: async (extension, options) => {
          return createPullRequest(
            await adapter.mergePullRequest(repository, data(pullRequest), {
              ...operationInput,
              ...options,
              ...(extension === undefined ? {} : { extension }),
            } as MergePullRequestOptions<TProvider, TRegistry>),
          );
        },
      });
    },
    requestReviewers(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      reviewers: readonly string[],
      options: OperationOptions = {},
    ) {
      const context = validationContext(adapter, "requestPullRequestReviewers");
      if (reviewers.length === 0) {
        throw new ValidationError("reviewers cannot be empty", context);
      }
      const validated = reviewers.map((reviewer) => requireIdentity(reviewer, "reviewer", context));
      return adapter.requestPullRequestReviewers(
        repository,
        data(pullRequest),
        validated,
        options,
      );
    },
    approve(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      body?: string,
      options: OperationOptions = {},
    ) {
      return adapter.approvePullRequest(repository, data(pullRequest), body, options);
    },
    comment(
      pullRequest: PullRequest<TProvider, TVersion, TRegistry>,
      input: PullRequestCommentInput,
      options: OperationOptions = {},
    ) {
      const context = validationContext(adapter, "publishPullRequestComment");
      requireIdentity(input.body, "comment body", context);
      if (input.position !== undefined) {
        requireIdentity(input.position.path, "pull request comment path", context);
        requirePositiveInteger(input.position.line, "pull request comment line", context);
        if (input.position.side !== "old" && input.position.side !== "new") {
          throw new ValidationError("pull request comment side must be old or new", context);
        }
      }
      return adapter.publishPullRequestComment(repository, data(pullRequest), input, options);
    },
    reviews(pullRequest: PullRequest<TProvider, TVersion, TRegistry>) {
      return createPullRequestReviews(
        adapter.provider,
        adapter.version,
        adapter,
        repository,
        pullRequest,
      );
    },
  });
}

function validationContext<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  return { provider: adapter.provider, version: adapter.version, operation };
}
