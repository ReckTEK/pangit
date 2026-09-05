import type { CommitData } from "../../../fluent-api/adapter-contract/commits.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { normalizeForgejoCommit } from "../commits/mod.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoEntityPayload, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  decodeForgejoPageCursor,
  forgejoPagination,
  requestForgejo,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { requireCommitArray } from "./validate-payload.ts";

/** Read exactly one page of pull-request commits with expensive per-commit facets disabled. */
export async function listForgejoPullRequestCommits<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  pullRequest: PullRequestData<"forgejo", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<CommitData<"forgejo", TVersion>>> {
  const operation = {
    universal: "listPullRequestCommits",
    native: "repoGetPullRequestCommits",
  } as const;
  const client = await context.client();
  const cursor = decodeForgejoPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestForgejo(
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
      normalizeForgejoCommit(
        client,
        payload as ForgejoEntityPayload<TVersion, "commit">,
        { files: false, stats: false, verification: false },
      )
    ),
    forgejoPagination(
      context,
      operation,
      response,
      cursor,
      limit,
      payloads.length,
    ),
  );
}
