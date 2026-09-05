import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  MergePullRequestOptions,
  PullRequestData,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { pollForgejo, requestForgejo } from "../transport/response/mod.ts";
import { requireNonNegativeInteger, validationError } from "./validate-payload.ts";

import { pullRequestPath, requestOptions } from "./request-options.ts";

import { getForgejoPullRequest } from "./get-pull-request.ts";

/** Merge directly, then perform the one hydration needed by the retained-data return contract. */
export async function mergeForgejoPullRequest<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  pullRequest: PullRequestData<"forgejo", TVersion>,
  options: MergePullRequestOptions<"forgejo"> = {},
): Promise<PullRequestData<"forgejo", TVersion>> {
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
      "scheduled Forgejo merge requires an explicit completion polling bound",
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
  await requestForgejo(
    context,
    mergeOperation,
    () =>
      client.repoMergePullRequest(
        {
          path: pullRequestPath(repository, pullRequest),
          body: {
            mediaType: "application/json",
            value: {
              Do: method,
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
                MergeCommitID: requireIdentity(
                  extension.mergeCommitId,
                  "pull-request merge commit ID",
                ),
              }),
              ...(extension?.mergeMessage === undefined
                ? {}
                : { MergeMessageField: extension.mergeMessage }),
              ...(extension?.mergeTitle === undefined
                ? {}
                : { MergeTitleField: extension.mergeTitle }),
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
    return await pollForgejo(
      context,
      hydrationOperation,
      polling,
      async () => {
        const current = await getForgejoPullRequest(
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
  return await getForgejoPullRequest(
    context,
    repository,
    pullRequest.number,
    options,
    hydrationOperation,
  );
}
