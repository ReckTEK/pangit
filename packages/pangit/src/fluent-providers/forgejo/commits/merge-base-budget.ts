import { IncompleteHistoryError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../versions.ts";

export type MergeBaseBudget = {
  remainingItems: number;
  remainingRequests: number;
  maximumRequests: number;
};

export const FIND_MERGE_BASES_LIST_OPERATION = {
  universal: "findMergeBases",
  native: "repoGetAllCommits",
} as const;

export function consumeMergeBaseRequests<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  budget: MergeBaseBudget,
  count: number,
): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError("merge-base request consumption must be a non-negative safe integer");
  }
  if (budget.remainingRequests < count) {
    throw requestBudgetExhausted(context, budget.maximumRequests, count);
  }
  budget.remainingRequests -= count;
}

export function requestBudgetExhausted<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  maximumRequests: number,
  nextRequestCount: number,
): IncompleteHistoryError {
  return new IncompleteHistoryError(
    `merge-base request budget ${maximumRequests} cannot start the next ${nextRequestCount} provider request${
      nextRequestCount === 1 ? "" : "s"
    }`,
    {
      provider: "forgejo",
      version: context.version,
      operation: FIND_MERGE_BASES_LIST_OPERATION.universal,
    },
  );
}
