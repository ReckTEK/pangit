import { IncompleteHistoryError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { CommitData } from "../../../fluent-api/adapter-contract/commits.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaEntityPayload, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { decodeGiteaPageCursor, giteaPagination, requestGitea } from "../transport/response/mod.ts";

import {
  consumeMergeBaseRequests,
  FIND_MERGE_BASES_LIST_OPERATION,
  type MergeBaseBudget,
} from "./merge-base-budget.ts";

import { repositoryPath, requestOptions } from "./request-options.ts";

import { requireCommitArray } from "./validate-payload.ts";
import { invariant } from "./errors.ts";
import { normalizeGiteaCommit } from "./normalize-commit.ts";

export async function scanExclusiveHistory<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  include: string,
  exclude: string,
  budget: MergeBaseBudget,
  signal?: AbortSignal,
): Promise<readonly CommitData<"gitea", TVersion>[]> {
  const client = await context.client();
  const commits: CommitData<"gitea", TVersion>[] = [];
  let cursor: string | undefined;
  do {
    if (budget.remainingItems < 1) {
      throw incompleteHistory(context, include, exclude, commits.length);
    }
    const decoded = decodeGiteaPageCursor(cursor, {
      version: context.version,
      operation: FIND_MERGE_BASES_LIST_OPERATION,
    });
    const limit = decoded.effectiveLimit ?? Math.min(50, budget.remainingItems);
    consumeMergeBaseRequests(context, budget, 1);
    const response = await requestGitea(
      context,
      FIND_MERGE_BASES_LIST_OPERATION,
      () =>
        client.repoGetAllCommits(
          {
            path: repositoryPath(repository),
            query: {
              sha: include,
              not: exclude,
              page: decoded.page,
              limit,
              files: false,
              stat: false,
              verification: false,
            },
          },
          requestOptions(signal),
        ),
      signal,
    );
    const payloads = requireCommitArray(
      context,
      FIND_MERGE_BASES_LIST_OPERATION,
      response,
    );
    if (payloads.length > limit) {
      throw invariant(
        context,
        FIND_MERGE_BASES_LIST_OPERATION,
        "exclusive-history page exceeded its requested page size",
        response,
      );
    }
    if (payloads.length > budget.remainingItems) {
      throw incompleteHistory(context, include, exclude, commits.length);
    }
    commits.push(...payloads.map((payload) =>
      normalizeGiteaCommit(
        client,
        payload as GiteaEntityPayload<TVersion, "commit">,
      )
    ));
    budget.remainingItems -= payloads.length;
    const pagination = giteaPagination(
      context,
      FIND_MERGE_BASES_LIST_OPERATION,
      response,
      decoded,
      limit,
      payloads.length,
    );
    cursor = pagination.nextCursor;
    if (cursor !== undefined && budget.remainingItems === 0) {
      throw incompleteHistory(context, include, exclude, commits.length);
    }
  } while (cursor !== undefined);
  return Object.freeze(commits);
}

function incompleteHistory<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  include: string,
  exclude: string,
  inspected: number,
): IncompleteHistoryError {
  return new IncompleteHistoryError(
    `merge-base history is incomplete after inspecting ${inspected} commits from ${include} excluding ${exclude}`,
    {
      provider: "gitea",
      version: context.version,
      operation: FIND_MERGE_BASES_LIST_OPERATION.universal,
    },
  );
}
