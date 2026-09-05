import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGitea } from "../transport/response/mod.ts";
import { validationError } from "./validate-payload.ts";
import { pullRequestPath, requestOptions } from "./request-options.ts";

/** Request reviewers with one direct provider mutation and no discovery preflight. */
export async function requestGiteaPullRequestReviewers<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
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
  await requestGitea(
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
