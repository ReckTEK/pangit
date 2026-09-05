import type { GiteaProviderTypes } from "../provider-types.ts";
import type { CommitData } from "../../../fluent-api/adapter-contract/commits.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { normalizeGiteaCommit } from "../commits/mod.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaEntityPayload, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { decodeGiteaPageCursor, giteaPagination, requestGitea } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { requireCommitArray } from "./validate-payload.ts";

/** Read exactly one page of pull-request commits with expensive per-commit facets disabled. */
export async function listGiteaPullRequestCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  pullRequest: PullRequestData<"gitea", TVersion, GiteaProviderTypes>,
  request: ResolvedPageRequest,
): Promise<Page<CommitData<"gitea", TVersion, GiteaProviderTypes>>> {
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
