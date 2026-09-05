import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejo } from "../transport/response/mod.ts";
import { validationError } from "./validate-payload.ts";
import { pullRequestPath, requestOptions } from "./request-options.ts";

/** Request reviewers with one direct provider mutation and no discovery preflight. */
export async function requestForgejoPullRequestReviewers<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  pullRequest: PullRequestData<"forgejo", TVersion>,
  reviewers: readonly string[],
  options: OperationOptions = {},
): Promise<void> {
  const operation = {
    universal: "requestPullRequestReviewers",
    native: "repoCreatePullReviewRequests",
  } as const;
  if (reviewers.length === 0) {
    throw validationError(context, operation, "reviewers cannot be empty");
  }
  const normalized = reviewers.map((reviewer) => requireIdentity(reviewer, "reviewer"));
  const client = await context.client();
  await requestForgejo(
    context,
    operation,
    () =>
      client.repoCreatePullReviewRequests(
        {
          path: pullRequestPath(repository, pullRequest),
          body: { mediaType: "application/json", value: { reviewers: normalized } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}
