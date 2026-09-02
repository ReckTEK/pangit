import type {
  ChangedFile as ChangedFile126,
  Issue as Issue126,
  PrBranchInfo as PrBranchInfo126,
} from "../../generated-rest-clients/gitea/1.26.4/GiteaRestClient.ts";
import type {
  ChangedFile as ChangedFile127,
  Issue as Issue127,
  PrBranchInfo as PrBranchInfo127,
} from "../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import type { AnyRestResponse } from "../../generated-rest-clients/runtime/mod.ts";
import type { CommitData, CommitFileData } from "../../fluent-api/adapter-contract/commits.ts";
import {
  ProviderInvariantError,
  ValidationError,
} from "../../fluent-api/adapter-contract/errors.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../fluent-api/adapter-contract/operation-options.ts";
import type { OperationOptions } from "../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../fluent-api/adapter-contract/pagination.ts";
import {
  type CreatePullRequestInput,
  type FindPullRequestInput,
  type ListPullRequestsRequest,
  MAX_PULL_REQUEST_SEARCH_HYDRATION_CONCURRENCY,
  type MergePullRequestOptions,
  type PullRequestCommentInput,
  type PullRequestData,
  type PullRequestRef,
  type UpdatePullRequestInput,
} from "../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import { normalizeGiteaCommit } from "./commits.ts";
import type { GiteaAdapterContext } from "./GiteaAdapterContext.ts";
import {
  createGiteaEntityNative,
  type GiteaClient,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "./native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  mapGiteaBounded,
  pollGitea,
  requestGitea,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "./response.ts";

type AnyGiteaPullRequest = GiteaEntityPayload<GiteaVersion, "pullRequest">;
type AnyGiteaChangedFile = ChangedFile126 | ChangedFile127;
type AnyGiteaPrBranchInfo = PrBranchInfo126 | PrBranchInfo127;
type AnyGiteaIssue = Issue126 | Issue127;

/** Read one bounded Gitea pull-request page; text search uses Gitea's server-side search. */
export async function listGiteaPullRequests<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ListPullRequestsRequest,
): Promise<Page<PullRequestData<"gitea", TVersion>>> {
  const searchOperation = {
    universal: "listPullRequests",
    native: "issueSearchIssues",
  } as const;
  const hydrateSearchResultOperation = {
    universal: "listPullRequests",
    native: "repoGetPullRequest",
  } as const;
  const listOperation = {
    universal: "listPullRequests",
    native: "repoListPullRequests",
  } as const;
  const path = repositoryPath(repository);
  const client = await context.client();
  const state = request.state;
  const base = optionalIdentity(request.base, "pull-request base branch");
  const author = optionalIdentity(request.author, "pull-request author");
  const head = request.head === undefined ? undefined : validateHeadSelector(request.head);
  const query = optionalIdentity(request.query, "pull-request text query");
  const operation = query === undefined ? listOperation : searchOperation;
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  if (query !== undefined) {
    const response = await requestGitea(
      context,
      searchOperation,
      () =>
        client.issueSearchIssues(
          {
            query: {
              type: "pulls",
              q: query,
              owner: repository.owner,
              page: cursor.page,
              limit,
              ...(state === undefined ? {} : { state }),
              ...(author === undefined ? {} : { created_by: author }),
            },
          },
          requestOptions(request.signal),
        ),
      request.signal,
    );
    const issues = requirePullRequestSearchArray(context, searchOperation, response);
    const repositoryIssues = issues.filter((issue) =>
      issue.repository?.full_name === repository.fullName ||
      issue.repository?.name === repository.name
    );
    const payloads = await mapGiteaBounded(
      context,
      hydrateSearchResultOperation,
      repositoryIssues,
      MAX_PULL_REQUEST_SEARCH_HYDRATION_CONCURRENCY,
      request.signal,
      async (issue, _index, workerSignal) => {
        const number = requiredPositiveInteger(issue.number, "pull-request search result number");
        return await requestGiteaBody<AnyGiteaPullRequest, TVersion>(
          context,
          hydrateSearchResultOperation,
          () =>
            client.repoGetPullRequest(
              { path: { ...path, index: number } },
              requestOptions(workerSignal),
            ),
          workerSignal,
          isPullRequestPayload,
        );
      },
    );
    const selected = payloads.filter((payload) =>
      (base === undefined ||
        normalizePullRequestRef(payload.base, "pull-request target").branch === base) &&
      (head === undefined || pullRequestMatchesHead(payload, repository, head))
    );
    const pagination = giteaPagination(
      context,
      searchOperation,
      response,
      cursor,
      limit,
      issues.length,
    );
    return createPage(
      selected.map((payload) => normalizeGiteaPullRequest(client, payload)),
      pagination,
    );
  }
  const response = await requestGitea(
    context,
    listOperation,
    () =>
      client.repoListPullRequests(
        {
          path,
          query: {
            page: cursor.page,
            limit,
            ...(state === undefined ? {} : { state }),
            ...(base === undefined ? {} : { base_branch: base }),
            ...(author === undefined ? {} : { poster: author }),
          },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requirePullRequestArray(context, listOperation, response);
  const selected = payloads.filter((payload) =>
    head === undefined || pullRequestMatchesHead(payload, repository, head)
  );
  const pagination = giteaPagination(
    context,
    listOperation,
    response,
    cursor,
    limit,
    payloads.length,
  );
  return createPage(
    selected.map((payload) => normalizeGiteaPullRequest(client, payload)),
    head === undefined
      ? pagination
      : pagination.nextCursor === undefined
      ? {}
      : { nextCursor: pagination.nextCursor },
  );
}

/** Fetch one pull request directly. */
export async function getGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  number: number,
  options: OperationOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "getPullRequest",
    native: "repoGetPullRequest",
  },
): Promise<PullRequestData<"gitea", TVersion>> {
  const index = requirePositiveInteger(number, "pull-request number");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoGetPullRequest(
        { path: { ...repositoryPath(repository), index } },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return normalizeGiteaPullRequest(client, payload);
}

/** Find one base/head pair with the provider's direct lookup and 404-only absence. */
export async function findGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: FindPullRequestInput,
  options: OperationOptions = {},
): Promise<PullRequestData<"gitea", TVersion> | undefined> {
  const operation = {
    universal: "findPullRequest",
    native: "repoGetPullRequestByBaseHead",
  } as const;
  const base = requireIdentity(input.base, "pull-request base branch");
  const head = validateHeadSelector(input.head);
  const client = await context.client();
  const payload = await requestOptionalGiteaBody<AnyGiteaPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoGetPullRequestByBaseHead(
        { path: { ...repositoryPath(repository), base, head } },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return payload === undefined ? undefined : normalizeGiteaPullRequest(client, payload);
}

/** Return retained merge state, or explicitly refresh it with one direct lookup. */
export async function isGiteaPullRequestMerged<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  refresh: boolean,
  options: OperationOptions = {},
): Promise<boolean> {
  if (!refresh) return pullRequest.merged;
  return (await getGiteaPullRequest(
    context,
    repository,
    pullRequest.number,
    options,
    { universal: "isPullRequestMerged", native: "repoGetPullRequest" },
  )).merged;
}

/** Read exactly one page of pull-request commits with expensive per-commit facets disabled. */
export async function listGiteaPullRequestCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<CommitData<"gitea", TVersion>>> {
  const operation = {
    universal: "listPullRequestCommits",
    native: "repoGetPullRequestCommits",
  } as const;
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoGetPullRequestCommits(
        {
          path: {
            ...repositoryPath(repository),
            index: requirePositiveInteger(pullRequest.number, "pull-request number"),
          },
          query: { page: cursor.page, limit, files: false, verification: false },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireCommitArray(context, operation, response);
  return createPage(
    payloads.map((payload) =>
      normalizeGiteaCommit(
        client,
        payload as GiteaEntityPayload<TVersion, "commit">,
        { files: false, stats: false, verification: false },
      )
    ),
    giteaPagination(
      context,
      operation,
      response,
      cursor,
      limit,
      payloads.length,
    ),
  );
}

/** Read exactly one page of files changed by a pull request. */
export async function listGiteaPullRequestFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<CommitFileData>> {
  const operation = {
    universal: "listPullRequestFiles",
    native: "repoGetPullRequestFiles",
  } as const;
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoGetPullRequestFiles(
        {
          path: {
            ...repositoryPath(repository),
            index: requirePositiveInteger(pullRequest.number, "pull-request number"),
          },
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireChangedFileArray(context, operation, response);
  return createPage(
    payloads.map(normalizeChangedFile),
    giteaPagination(
      context,
      operation,
      response,
      cursor,
      limit,
      payloads.length,
    ),
  );
}

/** Create a same-repository or fork pull request with an unambiguous Gitea head encoding. */
export async function createGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CreatePullRequestInput,
  options: OperationOptions = {},
): Promise<PullRequestData<"gitea", TVersion>> {
  const operation = { universal: "createPullRequest", native: "repoCreatePullRequest" } as const;
  const title = requireIdentity(input.title, "pull-request title");
  const base = requireIdentity(input.targetBranch, "pull-request target branch");
  const head = encodeCreateHead(context, repository, input.source, operation);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoCreatePullRequest(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              title,
              base,
              head,
              ...(input.description === undefined ? {} : { body: input.description }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return normalizeGiteaPullRequest(client, payload);
}

/** Update only fields explicitly supplied by the caller. */
export async function updateGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  input: UpdatePullRequestInput,
  options: OperationOptions = {},
): Promise<PullRequestData<"gitea", TVersion>> {
  const operation = { universal: "updatePullRequest", native: "repoEditPullRequest" } as const;
  if (
    input.title === undefined && input.description === undefined && input.targetBranch === undefined
  ) {
    throw validationError(context, operation, "pull-request update cannot be empty");
  }
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoEditPullRequest(
        {
          path: pullRequestPath(repository, pullRequest),
          body: {
            mediaType: "application/json",
            value: {
              ...(input.title === undefined
                ? {}
                : { title: requireIdentity(input.title, "pull-request title") }),
              ...(input.description === undefined ? {} : { body: input.description }),
              ...(input.targetBranch === undefined
                ? {}
                : { base: requireIdentity(input.targetBranch, "pull-request target branch") }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return normalizeGiteaPullRequest(client, payload);
}

/** Close one pull request directly through its edit endpoint. */
export async function closeGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  options: OperationOptions = {},
): Promise<PullRequestData<"gitea", TVersion>> {
  const operation = { universal: "closePullRequest", native: "repoEditPullRequest" } as const;
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoEditPullRequest(
        {
          path: pullRequestPath(repository, pullRequest),
          body: { mediaType: "application/json", value: { state: "closed" } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return normalizeGiteaPullRequest(client, payload);
}

/** Merge directly, then perform the one hydration needed by the retained-data return contract. */
export async function mergeGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  options: MergePullRequestOptions<"gitea"> = {},
): Promise<PullRequestData<"gitea", TVersion>> {
  const mergeOperation = {
    universal: "mergePullRequest",
    native: "repoMergePullRequest",
  } as const;
  const hydrationOperation = {
    universal: "mergePullRequest",
    native: "repoGetPullRequest",
  } as const;
  const extension = options.extension;
  const scheduledCompletion = extension?.scheduledCompletion;
  if (extension?.mergeWhenChecksSucceed === true && scheduledCompletion === undefined) {
    throw validationError(
      context,
      mergeOperation,
      "scheduled Gitea merge requires an explicit completion polling bound",
    );
  }
  if (scheduledCompletion !== undefined && extension?.mergeWhenChecksSucceed !== true) {
    throw validationError(
      context,
      mergeOperation,
      "scheduled completion polling requires mergeWhenChecksSucceed",
    );
  }
  const polling = scheduledCompletion === undefined ? undefined : {
    attempts: requirePositiveInteger(scheduledCompletion.attempts, "scheduled merge poll attempts"),
    intervalMs: requireNonNegativeInteger(
      scheduledCompletion.intervalMs ?? 200,
      "scheduled merge poll interval",
    ),
    signal: options.signal,
  };
  const client = await context.client();
  const method = extension?.method ?? (options.method === "squash" ? "squash" : "merge");
  await requestGitea(
    context,
    mergeOperation,
    () =>
      client.repoMergePullRequest(
        {
          path: pullRequestPath(repository, pullRequest),
          body: {
            mediaType: "application/json",
            value: {
              do: method,
              ...(options.deleteSourceBranch === undefined
                ? {}
                : { delete_branch_after_merge: options.deleteSourceBranch }),
              ...(extension?.forceMerge === undefined ? {} : { force_merge: extension.forceMerge }),
              ...(extension?.headCommitId === undefined ? {} : {
                head_commit_id: requireIdentity(
                  extension.headCommitId,
                  "pull-request merge head commit ID",
                ),
              }),
              ...(extension?.mergeCommitId === undefined ? {} : {
                merge_commit_id: requireIdentity(
                  extension.mergeCommitId,
                  "pull-request merge commit ID",
                ),
              }),
              ...(extension?.mergeMessage === undefined
                ? {}
                : { merge_message_field: extension.mergeMessage }),
              ...(extension?.mergeTitle === undefined
                ? {}
                : { merge_title_field: extension.mergeTitle }),
              ...(extension?.mergeWhenChecksSucceed === undefined
                ? {}
                : { merge_when_checks_succeed: extension.mergeWhenChecksSucceed }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
  if (polling !== undefined) {
    return await pollGitea(
      context,
      hydrationOperation,
      polling,
      async () => {
        const current = await getGiteaPullRequest(
          context,
          repository,
          pullRequest.number,
          options.signal === undefined ? {} : { signal: options.signal },
          hydrationOperation,
        );
        return current.merged ? current : undefined;
      },
    );
  }
  return await getGiteaPullRequest(
    context,
    repository,
    pullRequest.number,
    options,
    hydrationOperation,
  );
}

/** Request reviewers with one direct provider mutation and no discovery preflight. */
export async function requestGiteaPullRequestReviewers<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  reviewers: readonly string[],
  options: OperationOptions = {},
): Promise<void> {
  const operation = {
    universal: "requestPullRequestReviewers",
    native: "repoCreatePullReviewRequests",
  } as const;
  if (reviewers.length === 0) {
    throw validationError(context, operation, "reviewers cannot be empty");
  }
  const normalized = reviewers.map((reviewer) => requireIdentity(reviewer, "reviewer"));
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoCreatePullReviewRequests(
        {
          path: pullRequestPath(repository, pullRequest),
          body: { mediaType: "application/json", value: { reviewers: normalized } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Publish an approval directly rather than creating and then submitting a pending review. */
export async function approveGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  body?: string,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "approvePullRequest", native: "repoCreatePullReview" } as const;
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoCreatePullReview(
        {
          path: pullRequestPath(repository, pullRequest),
          body: {
            mediaType: "application/json",
            value: { event: "APPROVED", ...(body === undefined ? {} : { body }) },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Publish an issue-level PR comment or one inline review comment with one direct request. */
export async function publishGiteaPullRequestComment<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  input: PullRequestCommentInput,
  options: OperationOptions = {},
): Promise<void> {
  const issueCommentOperation = {
    universal: "publishPullRequestComment",
    native: "issueCreateComment",
  } as const;
  const reviewCommentOperation = {
    universal: "publishPullRequestComment",
    native: "repoCreatePullReview",
  } as const;
  const body = requireIdentity(input.body, "pull-request comment body");
  const client = await context.client();
  if (input.position === undefined) {
    await requestGitea(
      context,
      issueCommentOperation,
      () =>
        client.issueCreateComment(
          {
            path: pullRequestPath(repository, pullRequest),
            body: { mediaType: "application/json", value: { body } },
          },
          requestOptions(options.signal),
        ),
      options.signal,
    );
    return;
  }

  const position = input.position;
  const path = requireIdentity(position.path, "pull-request comment path");
  const line = requirePositiveInteger(position.line, "pull-request comment line");
  const commitId = requireIdentity(
    pullRequest.source.sha ?? "",
    "pull-request source commit SHA",
  );
  await requestGitea(
    context,
    reviewCommentOperation,
    () =>
      client.repoCreatePullReview(
        {
          path: pullRequestPath(repository, pullRequest),
          body: {
            mediaType: "application/json",
            value: {
              event: "COMMENT",
              commit_id: commitId,
              comments: [{
                body,
                path,
                ...(position.side === "old" ? { old_position: line } : { new_position: line }),
              }],
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Normalize one exact generated Gitea pull-request payload. */
export function normalizeGiteaPullRequest<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  pullRequest: AnyGiteaPullRequest,
): PullRequestData<"gitea", TVersion> {
  const number = requiredPositiveInteger(pullRequest.number, "pull-request number");
  const state = pullRequest.state;
  if (state !== "open" && state !== "closed") throw new TypeError("pull-request state is missing");
  if (typeof pullRequest.merged !== "boolean") {
    throw new TypeError(`pull-request ${number} merged state is missing`);
  }
  const description = optionalText(pullRequest.body);
  const author = optionalText(pullRequest.user?.login);
  const mergeBaseSha = optionalText(pullRequest.merge_base);
  const mergeCommitSha = optionalText(pullRequest.merge_commit_sha);
  const url = optionalText(pullRequest.html_url) ?? optionalText(pullRequest.url);
  return Object.freeze({
    id: requiredScalarText(pullRequest.id, "pull-request id"),
    number,
    title: requiredText(pullRequest.title, "pull-request title"),
    ...(description === undefined ? {} : { description }),
    state,
    source: normalizePullRequestRef(pullRequest.head, "pull-request source"),
    target: normalizePullRequestRef(pullRequest.base, "pull-request target"),
    ...(author === undefined ? {} : { author }),
    merged: pullRequest.merged,
    ...(typeof pullRequest.mergeable !== "boolean" ? {} : { mergeable: pullRequest.mergeable }),
    ...(mergeBaseSha === undefined ? {} : { mergeBaseSha }),
    ...(mergeCommitSha === undefined ? {} : { mergeCommitSha }),
    ...(url === undefined ? {} : { url }),
    native: createGiteaEntityNative(
      "pullRequest",
      client,
      pullRequest as GiteaEntityPayload<TVersion, "pullRequest">,
    ),
  });
}

function normalizePullRequestRef(value: unknown, name: string): PullRequestRef {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} is missing`);
  }
  const branch = value as AnyGiteaPrBranchInfo;
  const repository = branch.repo;
  if (repository === null || typeof repository !== "object" || Array.isArray(repository)) {
    throw new TypeError(`${name} repository is missing`);
  }
  const sha = optionalText(branch.sha);
  return Object.freeze({
    owner: requiredText(repository.owner?.login, `${name} owner`),
    repository: requiredText(repository.name, `${name} repository`),
    branch: requiredText(branch.ref, `${name} branch`),
    ...(sha === undefined ? {} : { sha }),
  });
}

function normalizeChangedFile(file: AnyGiteaChangedFile): CommitFileData {
  const previousPath = optionalText(file.previous_filename);
  const status = optionalText(file.status);
  const additions = optionalNonNegativeInteger(file.additions, "changed-file additions");
  const deletions = optionalNonNegativeInteger(file.deletions, "changed-file deletions");
  const changes = optionalNonNegativeInteger(file.changes, "changed-file changes");
  return Object.freeze({
    path: requiredText(file.filename, "changed-file path"),
    ...(previousPath === undefined ? {} : { previousPath }),
    ...(status === undefined ? {} : { status }),
    ...(additions === undefined ? {} : { additions }),
    ...(deletions === undefined ? {} : { deletions }),
    ...(changes === undefined ? {} : { changes }),
  });
}

function encodeCreateHead<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  target: RepositoryData<"gitea", TVersion>,
  source: PullRequestRef,
  operation: GiteaOperationIdentity,
): string {
  const owner = headPart(source.owner, "pull-request source owner");
  const repository = headPart(source.repository, "pull-request source repository");
  const branch = headPart(source.branch, "pull-request source branch");
  if (owner === target.owner && repository === target.name) return branch;
  if (owner === target.owner) {
    throw validationError(
      context,
      operation,
      "Gitea cannot encode a different source repository owned by the target owner",
    );
  }
  return `${owner}:${branch}`;
}

function validateHeadSelector(value: string): string {
  const head = requireIdentity(value, "pull-request head");
  const parts = head.split(":");
  if (parts.length > 2 || parts.some((part) => part.trim().length === 0)) {
    throw new TypeError("pull-request head must be a branch or owner:branch");
  }
  return parts.map((part) => headPart(part, "pull-request head component")).join(":");
}

function headPart(value: string, name: string): string {
  const part = requireIdentity(value, name);
  if (part.includes(":")) throw new TypeError(`${name} cannot contain ':'`);
  return part;
}

function pullRequestMatchesHead(
  pullRequest: AnyGiteaPullRequest,
  target: { readonly owner: string; readonly name: string },
  expected: string,
): boolean {
  try {
    const source = normalizePullRequestRef(pullRequest.head, "pull-request source");
    const actual = source.owner === target.owner && source.repository === target.name
      ? source.branch
      : `${source.owner}:${source.branch}`;
    return actual === expected;
  } catch {
    return false;
  }
}

function requirePullRequestArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
): readonly AnyGiteaPullRequest[] {
  if (Array.isArray(response.body) && response.body.every(isPullRequestPayload)) {
    return response.body;
  }
  throw malformedArray(context, operation, response, "pull-request");
}

function requirePullRequestSearchArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
): readonly AnyGiteaIssue[] {
  if (
    Array.isArray(response.body) &&
    response.body.every(isPullRequestSearchPayload)
  ) {
    return response.body as readonly AnyGiteaIssue[];
  }
  throw malformedArray(context, operation, response, "pull-request search result");
}

function isPullRequestSearchPayload(value: unknown): value is AnyGiteaIssue {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const issue = value as AnyGiteaIssue;
  const repository = issue.repository;
  return isPositiveInteger(issue.number) && repository !== null &&
    typeof repository === "object" && !Array.isArray(repository) &&
    typeof repository.name === "string" && typeof repository.owner === "string" &&
    issue.pull_request !== null && typeof issue.pull_request === "object" &&
    !Array.isArray(issue.pull_request);
}

function requireCommitArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
): readonly GiteaEntityPayload<GiteaVersion, "commit">[] {
  if (Array.isArray(response.body) && response.body.every(isCommitPayload)) return response.body;
  throw malformedArray(context, operation, response, "commit");
}

function requireChangedFileArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
): readonly AnyGiteaChangedFile[] {
  if (Array.isArray(response.body) && response.body.every(isChangedFilePayload)) {
    return response.body;
  }
  throw malformedArray(context, operation, response, "changed-file");
}

function malformedArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
  entity: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation.universal} returned malformed ${entity} data`, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
    status: response.status,
    cause: response,
  });
}

function isPullRequestPayload(value: unknown): value is AnyGiteaPullRequest {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const pullRequest = value as AnyGiteaPullRequest;
  return hasScalar(pullRequest.id) && isPositiveInteger(pullRequest.number) &&
    hasText(pullRequest.title) &&
    (pullRequest.state === "open" || pullRequest.state === "closed") &&
    typeof pullRequest.merged === "boolean" && hasPullRequestRefShape(pullRequest.head) &&
    hasPullRequestRefShape(pullRequest.base);
}

function hasPullRequestRefShape(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const branch = value as AnyGiteaPrBranchInfo;
  return hasText(branch.ref) && branch.repo !== null && typeof branch.repo === "object" &&
    !Array.isArray(branch.repo) && hasText(branch.repo.name) && hasText(branch.repo.owner?.login);
}

function isCommitPayload(value: unknown): value is GiteaEntityPayload<GiteaVersion, "commit"> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    hasText((value as { readonly sha?: unknown }).sha);
}

function isChangedFilePayload(value: unknown): value is AnyGiteaChangedFile {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    hasText((value as AnyGiteaChangedFile).filename);
}

function pullRequestPath<TVersion extends GiteaVersion>(
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
) {
  return {
    ...repositoryPath(repository),
    index: requirePositiveInteger(pullRequest.number, "pull-request number"),
  };
}

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function optionalIdentity(value: string | undefined, name: string): string | undefined {
  return value === undefined ? undefined : requireIdentity(value, name);
}

function requireNonNegativeInteger(value: number, name: string): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
  });
}

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function requiredScalarText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

function requiredPositiveInteger(value: unknown, name: string): number {
  if (!isPositiveInteger(value)) throw new TypeError(`${name} is missing or invalid`);
  return value;
}

function optionalNonNegativeInteger(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new TypeError(`${name} is invalid`);
  }
  return value as number;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasScalar(value: unknown): boolean {
  return typeof value === "string" && value.length > 0 ||
    typeof value === "number" && Number.isSafeInteger(value) || typeof value === "bigint";
}
