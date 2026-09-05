import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";
import type { ProviderExtensions } from "../../provider-extensions/ExtensionSupport.ts";

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
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = OperationExtension<
  "issues.update",
  TProvider,
  TVersion,
  Issue<TProvider, TVersion, TRegistry>,
  TRegistry
>;

export interface RepositoryIssues<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly support: IssueCapabilitySupport;
  list(options?: ListIssuesOptions): Promise<Page<Issue<TProvider, TVersion, TRegistry>>>;
  get(number: number, options?: OperationOptions): Promise<Issue<TProvider, TVersion, TRegistry>>;
  create(
    input: CreateIssueInput,
    options?: OperationOptions,
  ): Promise<Issue<TProvider, TVersion, TRegistry>>;
  update(
    issue: Issue<TProvider, TVersion, TRegistry>,
    input: UpdateIssueInput,
  ): IssueUpdateOperation<TProvider, TVersion, TRegistry>;
  setState(
    issue: Issue<TProvider, TVersion, TRegistry>,
    state: IssueState,
    options?: OperationOptions,
  ): Promise<Issue<TProvider, TVersion, TRegistry>>;
  comments: Readonly<{
    list(
      issue: Issue<TProvider, TVersion, TRegistry>,
      request?: PageRequest,
    ): Promise<ScanPage<IssueComment<TProvider, TVersion, TRegistry>>>;
    get(
      id: string,
      options?: OperationOptions,
    ): Promise<IssueComment<TProvider, TVersion, TRegistry>>;
    create(
      issue: Issue<TProvider, TVersion, TRegistry>,
      input: IssueCommentInput,
      options?: OperationOptions,
    ): Promise<IssueComment<TProvider, TVersion, TRegistry>>;
    update(
      comment: IssueComment<TProvider, TVersion, TRegistry>,
      input: IssueCommentInput,
      options?: OperationOptions,
    ): Promise<IssueComment<TProvider, TVersion, TRegistry>>;
    delete(
      comment: IssueComment<TProvider, TVersion, TRegistry>,
      options?: OperationOptions,
    ): Promise<void>;
  }>;
}

export function createRepositoryIssues<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  provider: TProvider,
  version: TVersion,
  adapter: IssueAdapter<TProvider, TVersion, TRegistry> & {
    readonly extensions: ProviderExtensions<TProvider, TRegistry>;
  },
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
): RepositoryIssues<TProvider, TVersion, TRegistry> {
  const validationContext = (operation: string) => ({ provider, version, operation });
  const resolveRequest = (request: PageRequest, operation: string) => {
    if (request.limit !== undefined) {
      requirePositiveInteger(request.limit, "page limit", validationContext(operation));
    }
    return resolvePageRequest(request, 50, validationContext(operation));
  };
  const issueData = (
    issue: Issue<TProvider, TVersion, TRegistry>,
  ): IssueData<TProvider, TVersion, TRegistry> => ({
    ...issue,
    assignees: [...issue.assignees],
    labels: [...issue.labels],
    native: issue.native,
  });
  const commentData = (
    comment: IssueComment<TProvider, TVersion, TRegistry>,
  ): IssueCommentData<TProvider, TVersion, TRegistry> => ({ ...comment, native: comment.native });
  const comments = Object.freeze({
    async list(issue: Issue<TProvider, TVersion, TRegistry>, request: PageRequest = {}) {
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
      issue: Issue<TProvider, TVersion, TRegistry>,
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
      comment: IssueComment<TProvider, TVersion, TRegistry>,
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
      comment: IssueComment<TProvider, TVersion, TRegistry>,
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
    update(issue: Issue<TProvider, TVersion, TRegistry>, input: UpdateIssueInput) {
      const operationInput = structuredClone(input);
      const context = validationContext("updateIssue");
      if (operationInput.title === undefined && operationInput.description === undefined) {
        throw new ValidationError("issue update requires a title or description", context);
      }
      if (operationInput.title !== undefined) {
        requireIdentity(operationInput.title, "issue title", context);
      }
      return createOperationExtension<
        "issues.update",
        TProvider,
        TVersion,
        Issue<TProvider, TVersion, TRegistry>,
        TRegistry
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
              operationInput,
              {
                ...options,
                ...(extension === undefined ? {} : { extension }),
              } as IssueUpdateOptions<TProvider, TRegistry>,
            ),
          );
        },
      });
    },
    async setState(
      issue: Issue<TProvider, TVersion, TRegistry>,
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
