import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import {
  type ListPullRequestsRequest,
  MAX_PULL_REQUEST_SEARCH_HYDRATION_CONCURRENCY,
  type PullRequestData,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  decodeForgejoPageCursor,
  forgejoPagination,
  mapForgejoBounded,
  requestForgejo,
  requestForgejoBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import {
  isPullRequestPayload,
  optionalIdentity,
  requiredPositiveInteger,
  requirePullRequestArray,
  requirePullRequestSearchArray,
} from "./validate-payload.ts";
import { pullRequestMatchesHead, validateHeadSelector } from "./head-selector.ts";

import type { AnyForgejoPullRequest } from "./payload-types.ts";
import { normalizeForgejoPullRequest, normalizePullRequestRef } from "./normalize-pull-request.ts";

/** Read one bounded Forgejo pull-request page; text search uses Forgejo's server-side search. */
export async function listForgejoPullRequests<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  request: ListPullRequestsRequest,
): Promise<Page<PullRequestData<"forgejo", TVersion>>> {
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
  const cursor = decodeForgejoPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  if (query !== undefined) {
    const response = await requestForgejo(
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
    const payloads = await mapForgejoBounded(
      context,
      hydrateSearchResultOperation,
      repositoryIssues,
      MAX_PULL_REQUEST_SEARCH_HYDRATION_CONCURRENCY,
      request.signal,
      async (issue, _index, workerSignal) => {
        const number = requiredPositiveInteger(issue.number, "pull-request search result number");
        return await requestForgejoBody<AnyForgejoPullRequest, TVersion>(
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
    const pagination = forgejoPagination(
      context,
      searchOperation,
      response,
      cursor,
      limit,
      issues.length,
    );
    return createPage(
      selected.map((payload) => normalizeForgejoPullRequest(client, payload)),
      pagination,
    );
  }
  const response = await requestForgejo(
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
  const pagination = forgejoPagination(
    context,
    listOperation,
    response,
    cursor,
    limit,
    payloads.length,
  );
  return createPage(
    selected.map((payload) => normalizeForgejoPullRequest(client, payload)),
    head === undefined
      ? pagination
      : pagination.nextCursor === undefined
      ? {}
      : { nextCursor: pagination.nextCursor },
  );
}
