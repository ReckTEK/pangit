import type { ForgejoProviderTypes } from "../provider-types.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  PullRequestCommentInput,
  PullRequestData,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejo } from "../transport/response/mod.ts";
import { pullRequestPath, requestOptions } from "./request-options.ts";

/** Publish an issue-level PR comment or one inline review comment with one direct request. */
export async function publishForgejoPullRequestComment<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  pullRequest: PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: PullRequestCommentInput,
  options: OperationOptions = {},
): Promise<void> {
  const issueCommentOperation = {
    universal: "publishPullRequestComment",
    native: "issueCreateComment",
  } as const;
  const reviewCommentOperation = {
    universal: "publishPullRequestComment",
    native: "repoCreatePullReview",
  } as const;
  const body = requireIdentity(input.body, "pull-request comment body");
  const client = await context.client();
  if (input.position === undefined) {
    await requestForgejo(
      context,
      issueCommentOperation,
      () =>
        client.issueCreateComment(
          {
            path: pullRequestPath(repository, pullRequest),
            body: { mediaType: "application/json", value: { body } },
          },
          requestOptions(options.signal),
        ),
      options.signal,
    );
    return;
  }

  const position = input.position;
  const path = requireIdentity(position.path, "pull-request comment path");
  const line = requirePositiveInteger(position.line, "pull-request comment line");
  const commitId = requireIdentity(
    pullRequest.source.sha ?? "",
    "pull-request source commit SHA",
  );
  await requestForgejo(
    context,
    reviewCommentOperation,
    () =>
      client.repoCreatePullReview(
        {
          path: pullRequestPath(repository, pullRequest),
          body: {
            mediaType: "application/json",
            value: {
              event: "COMMENT",
              commit_id: commitId,
              comments: [{
                body,
                path,
                ...(position.side === "old" ? { old_position: line } : { new_position: line }),
              }],
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}
