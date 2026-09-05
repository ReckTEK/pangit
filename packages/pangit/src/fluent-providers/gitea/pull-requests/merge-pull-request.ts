import type { GiteaProviderTypes } from "../provider-types.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  MergePullRequestOptions,
  PullRequestData,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { pollGitea, requestGitea } from "../transport/response/mod.ts";
import { requireNonNegativeInteger, validationError } from "./validate-payload.ts";

import { pullRequestPath, requestOptions } from "./request-options.ts";

import { getGiteaPullRequest } from "./get-pull-request.ts";

/** Merge directly, then perform the one hydration needed by the retained-data return contract. */
export async function mergeGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  pullRequest: PullRequestData<"gitea", TVersion, GiteaProviderTypes>,
  options: MergePullRequestOptions<"gitea", GiteaProviderTypes> = {},
): Promise<PullRequestData<"gitea", TVersion, GiteaProviderTypes>> {
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
