import type { GiteaProviderTypes } from "../provider-types.ts";
import {
  type CommitData,
  DEFAULT_COMMIT_MULTI_GET_MAX_ITEMS,
  type GetCommitOptions,
  type GetCommitsOptions,
  type ListCommitsRequest,
} from "../../../fluent-api/adapter-contract/commits.ts";

import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaEntityPayload, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  mapGiteaBounded,
  requestGitea,
  requestGiteaBody,
} from "../transport/response/mod.ts";

import {
  boundedConcurrency,
  facetsQuery,
  repositoryPath,
  requestOptions,
} from "./request-options.ts";

import { isCommitPayloadForFacets, requireCommitArray, requiredDate } from "./validate-payload.ts";

import { normalizeGiteaCommit } from "./normalize-commit.ts";
import type { AnyGiteaCommit } from "./payload-types.ts";

import { validationError } from "./errors.ts";

/** Read exactly one bounded commit page, with every expensive Gitea facet disabled by default. */
export async function listGiteaCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  request: ListCommitsRequest,
  operation: GiteaOperationIdentity = {
    universal: "listCommits",
    native: "repoGetAllCommits",
  },
): Promise<Page<CommitData<"gitea", TVersion, GiteaProviderTypes>>> {
  const client = await context.client();
  const path = repositoryPath(repository);
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoGetAllCommits(
        {
          path,
          query: {
            page: cursor.page,
            limit,
            ...facetsQuery(request),
            ...(request.ref === undefined
              ? {}
              : { sha: requireIdentity(request.ref, "commit ref") }),
            ...(request.excluding === undefined
              ? {}
              : { not: requireIdentity(request.excluding, "excluded commit ref") }),
            ...(request.since === undefined ? {} : { since: requiredDate(request.since, "since") }),
            ...(request.until === undefined ? {} : { until: requiredDate(request.until, "until") }),
          },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireCommitArray(context, operation, response, request);
  return createPage(
    payloads.map((payload) =>
      normalizeGiteaCommit(
        client,
        payload as GiteaEntityPayload<TVersion, "commit">,
        request,
      )
    ),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one commit directly and request only the explicitly selected facets. */
export async function getGiteaCommit<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  sha: string,
  options: GetCommitOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "getCommit",
    native: "repoGetSingleCommit",
  },
): Promise<CommitData<"gitea", TVersion, GiteaProviderTypes>> {
  const commitSha = requireIdentity(sha, "commit SHA");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaCommit, TVersion>(
    context,
    operation,
    () =>
      client.repoGetSingleCommit(
        {
          path: { ...repositoryPath(repository), sha: commitSha },
          query: facetsQuery(options),
        },
        requestOptions(options.signal),
      ),
    options.signal,
    (value): value is AnyGiteaCommit => isCommitPayloadForFacets(value, options),
  );
  return normalizeGiteaCommit(
    client,
    payload as GiteaEntityPayload<TVersion, "commit">,
    options,
  );
}

/** Fetch only the requested unique SHAs with bounded concurrency, then restore input order. */
export async function getGiteaCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  shas: readonly string[],
  options: GetCommitsOptions = {},
): Promise<readonly CommitData<"gitea", TVersion, GiteaProviderTypes>[]> {
  const operation = { universal: "getCommits", native: "repoGetSingleCommit" } as const;
  const maxItems = requirePositiveInteger(
    options.maxItems ?? DEFAULT_COMMIT_MULTI_GET_MAX_ITEMS,
    "maximum commit items",
  );
  if (shas.length > maxItems) {
    throw validationError(
      context,
      operation,
      `requested ${shas.length} commits, exceeding the ${maxItems} item limit`,
    );
  }
  const validated = shas.map((sha) => requireIdentity(sha, "commit SHA"));
  const unique = [...new Set(validated)];
  const concurrency = boundedConcurrency(options.concurrency);
  const fetched = await mapGiteaBounded(
    context,
    operation,
    unique,
    concurrency,
    options.signal,
    (sha, _index, workerSignal) =>
      getGiteaCommit(context, repository, sha, { ...options, signal: workerSignal }, operation),
  );
  const byInput = new Map(unique.map((sha, index) => [sha, fetched[index]]));
  return Object.freeze(validated.map((sha) => byInput.get(sha)!));
}
