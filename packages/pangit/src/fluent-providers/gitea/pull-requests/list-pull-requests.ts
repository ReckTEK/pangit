import type { GiteaProviderTypes } from "../provider-types.ts";
import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import {
  type ListPullRequestsRequest,
  MAX_PULL_REQUEST_SEARCH_HYDRATION_CONCURRENCY,
  type PullRequestData,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  mapGiteaBounded,
  requestGitea,
  requestGiteaBody,
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

import type { AnyGiteaPullRequest } from "./payload-types.ts";
import { normalizeGiteaPullRequest, normalizePullRequestRef } from "./normalize-pull-request.ts";

/** Read one bounded Gitea pull-request page; text search uses Gitea's server-side search. */
export async function listGiteaPullRequests<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  request: ListPullRequestsRequest,
): Promise<Page<PullRequestData<"gitea", TVersion, GiteaProviderTypes>>> {
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
