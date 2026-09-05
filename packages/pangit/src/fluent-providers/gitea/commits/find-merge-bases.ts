import { IncompleteHistoryError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  MergeBaseOptions,
  MergeBasesResult,
} from "../../../fluent-api/adapter-contract/commits.ts";

import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { mapGiteaBounded } from "../transport/response/mod.ts";

import {
  consumeMergeBaseRequests,
  FIND_MERGE_BASES_LIST_OPERATION,
  type MergeBaseBudget,
  requestBudgetExhausted,
} from "./merge-base-budget.ts";
import { scanExclusiveHistory } from "./scan-history.ts";
import { boundedConcurrency } from "./request-options.ts";
import { getGiteaCommit } from "./read-commits.ts";
import { countGiteaReachableCommits } from "./count-reachable.ts";

const FIND_MERGE_BASES_GET_OPERATION = {
  universal: "findMergeBases",
  native: "repoGetSingleCommit",
} as const;

/**
 * Find maximal common ancestors within explicit item and provider-request budgets.
 *
 * The two exclusive-history scans consume at most `maxItems` commit objects in total. If either
 * side has more history when that ceiling is reached, the operation fails explicitly rather than
 * returning a partial merge-base answer. Every count, scan, hydration, and maximality probe also
 * consumes one unit from `maxRequests` before it starts.
 */
export async function findGiteaMergeBases<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  left: string,
  right: string,
  options: MergeBaseOptions,
): Promise<MergeBasesResult<"gitea", TVersion>> {
  const leftRef = requireIdentity(left, "left ref");
  const rightRef = requireIdentity(right, "right ref");
  const maximum = requirePositiveInteger(options.maxItems, "maximum inspected commits");
  const maximumRequests = requirePositiveInteger(
    options.maxRequests,
    "maximum merge-base requests",
  );
  if (maximumRequests < 2) {
    throw requestBudgetExhausted(context, maximumRequests, 2);
  }
  const budget: MergeBaseBudget = {
    remainingItems: maximum,
    remainingRequests: maximumRequests,
    maximumRequests,
  };
  const [leftCount, rightCount] = await Promise.all([
    countMergeBaseReachable(context, repository, leftRef, rightRef, budget, options),
    countMergeBaseReachable(context, repository, rightRef, leftRef, budget, options),
  ]);
  if (leftCount + rightCount > maximum) {
    throw new IncompleteHistoryError(
      `merge-base history requires inspecting ${
        leftCount + rightCount
      } commits, exceeding the ${maximum} item limit`,
      {
        provider: "gitea",
        version: context.version,
        operation: FIND_MERGE_BASES_LIST_OPERATION.universal,
      },
    );
  }
  const leftExclusive = await scanExclusiveHistory(
    context,
    repository,
    leftRef,
    rightRef,
    budget,
    options.signal,
  );
  const rightExclusive = await scanExclusiveHistory(
    context,
    repository,
    rightRef,
    leftRef,
    budget,
    options.signal,
  );
  const leftSet = new Set(leftExclusive.map((commit) => commit.sha));
  const rightSet = new Set(rightExclusive.map((commit) => commit.sha));
  const candidateRefs = new Set<string>([leftRef, rightRef]);
  for (const commit of leftExclusive) {
    for (const parent of commit.parents) if (!leftSet.has(parent)) candidateRefs.add(parent);
  }
  for (const commit of rightExclusive) {
    for (const parent of commit.parents) if (!rightSet.has(parent)) candidateRefs.add(parent);
  }

  const commonRefs: string[] = [];
  for (const candidate of candidateRefs) {
    if (
      await countMergeBaseReachable(
          context,
          repository,
          candidate,
          leftRef,
          budget,
          options,
        ) === 0 &&
      await countMergeBaseReachable(
          context,
          repository,
          candidate,
          rightRef,
          budget,
          options,
        ) === 0
    ) {
      commonRefs.push(candidate);
    }
  }
  consumeMergeBaseRequests(context, budget, commonRefs.length);
  const resolved = await mapGiteaBounded(
    context,
    FIND_MERGE_BASES_GET_OPERATION,
    commonRefs,
    boundedConcurrency(options.concurrency),
    options.signal,
    (candidate, _index, workerSignal) =>
      getGiteaCommit(
        context,
        repository,
        candidate,
        { ...options, signal: workerSignal },
        FIND_MERGE_BASES_GET_OPERATION,
      ),
  );
  const unique = [...new Map(resolved.map((commit) => [commit.sha, commit])).values()];
  const nonMaximal = new Set<string>();
  for (const candidate of unique) {
    for (const other of unique) {
      if (candidate.sha === other.sha) continue;
      if (
        await countMergeBaseReachable(
          context,
          repository,
          candidate.sha,
          other.sha,
          budget,
          options,
        ) === 0
      ) {
        nonMaximal.add(candidate.sha);
        break;
      }
    }
  }
  return Object.freeze({
    commits: Object.freeze(unique.filter((commit) => !nonMaximal.has(commit.sha))),
    complete: true,
  });
}

function countMergeBaseReachable<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  include: string,
  exclude: string,
  budget: MergeBaseBudget,
  options: OperationOptions,
): Promise<number> {
  consumeMergeBaseRequests(context, budget, 1);
  return countGiteaReachableCommits(
    context,
    repository,
    include,
    exclude,
    options,
    FIND_MERGE_BASES_LIST_OPERATION,
  );
}
