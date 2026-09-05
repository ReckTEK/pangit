import type { ProviderExtensions } from "../../provider-extensions/ExtensionSupport.ts";
import type { FluentProvider, ProviderVersion } from "../../adapter-contract/provider.ts";
import type {
  CreateIssueInput,
  IssueAdapter,
  IssueCapabilitySupport,
  IssueCommentData,
  IssueCommentInput,
  IssueData,
  IssueState,
  IssueUpdateOptions,
  ListIssuesRequest,
  UpdateIssueInput,
} from "../../adapter-contract/optional/issues.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../adapter-contract/operation-options.ts";

import { ValidationError } from "../../adapter-contract/errors.ts";
import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
  type ScanPage,
} from "../../adapter-contract/pagination.ts";

import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import {
  createIssueCommentEntity,
  createIssueEntity,
  type Issue,
  type IssueComment,
} from "../../entities/optional/Issue.ts";
import {
  createOperationExtension,
  type OperationExtension,
} from "../../provider-extensions/OperationExtension.ts";

export interface ListIssuesOptions
  extends PageRequest, Omit<ListIssuesRequest, "limit" | "cursor" | "signal"> {}

export type IssueUpdateOperation<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = OperationExtension<
  "issues.update",
  TProvider,
  TVersion,
  Issue<TProvider, TVersion>
>;

export interface RepositoryIssues<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly support: IssueCapabilitySupport;
  list(options?: ListIssuesOptions): Promise<Page<Issue<TProvider, TVersion>>>;
  get(number: number, options?: OperationOptions): Promise<Issue<TProvider, TVersion>>;
  create(input: CreateIssueInput, options?: OperationOptions): Promise<Issue<TProvider, TVersion>>;
  update(
    issue: Issue<TProvider, TVersion>,
    input: UpdateIssueInput,
  ): IssueUpdateOperation<TProvider, TVersion>;
  setState(
    issue: Issue<TProvider, TVersion>,
    state: IssueState,
    options?: OperationOptions,
  ): Promise<Issue<TProvider, TVersion>>;
  comments: Readonly<{
    list(
      issue: Issue<TProvider, TVersion>,
      request?: PageRequest,
    ): Promise<ScanPage<IssueComment<TProvider, TVersion>>>;
    get(id: string, options?: OperationOptions): Promise<IssueComment<TProvider, TVersion>>;
    create(
      issue: Issue<TProvider, TVersion>,
      input: IssueCommentInput,
      options?: OperationOptions,
    ): Promise<IssueComment<TProvider, TVersion>>;
    update(
      comment: IssueComment<TProvider, TVersion>,
      input: IssueCommentInput,
      options?: OperationOptions,
    ): Promise<IssueComment<TProvider, TVersion>>;
    delete(
      comment: IssueComment<TProvider, TVersion>,
      options?: OperationOptions,
    ): Promise<void>;
  }>;
}

export function createRepositoryIssues<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  adapter: IssueAdapter<TProvider, TVersion> & {
    readonly extensions: ProviderExtensions<TProvider>;
  },
  repository: RepositoryData<TProvider, TVersion>,
): RepositoryIssues<TProvider, TVersion> {
  const validationContext = (operation: string) => ({ provider, version, operation });
  const resolveRequest = (request: PageRequest, operation: string) => {
    if (request.limit !== undefined) {
      requirePositiveInteger(request.limit, "page limit", validationContext(operation));
    }
    return resolvePageRequest(request, 50, validationContext(operation));
  };
  const issueData = (issue: Issue<TProvider, TVersion>): IssueData<TProvider, TVersion> => ({
    ...issue,
    assignees: [...issue.assignees],
    labels: [...issue.labels],
    native: issue.native,
  });
  const commentData = (
    comment: IssueComment<TProvider, TVersion>,
  ): IssueCommentData<TProvider, TVersion> => ({ ...comment, native: comment.native });
  const comments = Object.freeze({
    async list(issue: Issue<TProvider, TVersion>, request: PageRequest = {}) {
      const page = await adapter.listIssueComments(
        repository,
        issueData(issue),
        resolveRequest(request, "listIssueComments"),
      );
      return Object.freeze({
        ...createPage(page.items.map(createIssueCommentEntity), page),
        complete: page.complete,
      });
    },
    async get(id: string, options: OperationOptions = {}) {
      requireIdentity(id, "issue comment id", validationContext("getIssueComment"));
      return createIssueCommentEntity(await adapter.getIssueComment(repository, id, options));
    },
    async create(
      issue: Issue<TProvider, TVersion>,
      input: IssueCommentInput,
      options: OperationOptions = {},
    ) {
      requireIdentity(
        input.body,
        "issue comment body",
        validationContext("createIssueComment"),
      );
      return createIssueCommentEntity(
        await adapter.createIssueComment(repository, issueData(issue), input, options),
      );
    },
    async update(
      comment: IssueComment<TProvider, TVersion>,
      input: IssueCommentInput,
      options: OperationOptions = {},
    ) {
      requireIdentity(
        input.body,
        "issue comment body",
        validationContext("updateIssueComment"),
      );
      return createIssueCommentEntity(
        await adapter.updateIssueComment(repository, commentData(comment), input, options),
      );
    },
    delete(
      comment: IssueComment<TProvider, TVersion>,
      options: OperationOptions = {},
    ) {
      return adapter.deleteIssueComment(repository, commentData(comment), options);
    },
  });
  return Object.freeze({
    support: adapter.issueSupport,
    async list(options: ListIssuesOptions = {}) {
      const context = validationContext("listIssues");
      const labels = options.labels?.map((label) => requireIdentity(label, "issue label", context));
      const page = await adapter.listIssues(repository, {
        ...resolveRequest(options, "listIssues"),
        ...(options.state === undefined ? {} : { state: options.state }),
        ...(options.query === undefined
          ? {}
          : { query: requireIdentity(options.query, "issue query", context) }),
        ...(labels === undefined ? {} : { labels }),
      });
      return createPage(page.items.map(createIssueEntity), page);
    },
    async get(number: number, options: OperationOptions = {}) {
      requirePositiveInteger(number, "issue number", validationContext("getIssue"));
      return createIssueEntity(await adapter.getIssue(repository, number, options));
    },
    async create(input: CreateIssueInput, options: OperationOptions = {}) {
      requireIdentity(input.title, "issue title", validationContext("createIssue"));
      return createIssueEntity(await adapter.createIssue(repository, input, options));
    },
    update(issue: Issue<TProvider, TVersion>, input: UpdateIssueInput) {
      const context = validationContext("updateIssue");
      if (input.title === undefined && input.description === undefined) {
        throw new ValidationError("issue update requires a title or description", context);
      }
      if (input.title !== undefined) requireIdentity(input.title, "issue title", context);
      return createOperationExtension<
        "issues.update",
        TProvider,
        TVersion,
        Issue<TProvider, TVersion>
      >({
        operation: "issues.update",
        support: adapter.extensions["issues.update"],
        validationContext: context,
        provider,
        version,
        context: Object.freeze({ issueNumber: issue.number }),
        execute: async (extension, options) => {
          return createIssueEntity(
            await adapter.updateIssue(
              repository,
              issueData(issue),
              input,
              {
                ...options,
                ...(extension === undefined ? {} : { extension }),
              } as IssueUpdateOptions<TProvider>,
            ),
          );
        },
      });
    },
    async setState(
      issue: Issue<TProvider, TVersion>,
      state: IssueState,
      options: OperationOptions = {},
    ) {
      if (state !== "open" && state !== "closed") {
        throw new ValidationError("invalid issue state", validationContext("setIssueState"));
      }
      return createIssueEntity(
        await adapter.setIssueState(repository, issueData(issue), state, options),
      );
    },
    comments,
  });
}
