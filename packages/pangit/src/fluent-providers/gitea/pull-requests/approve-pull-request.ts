import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGitea } from "../transport/response/mod.ts";
import { pullRequestPath, requestOptions } from "./request-options.ts";

/** Publish an approval directly rather than creating and then submitting a pending review. */
export async function approveGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
  body?: string,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "approvePullRequest", native: "repoCreatePullReview" } as const;
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoCreatePullReview(
        {
          path: pullRequestPath(repository, pullRequest),
          body: {
            mediaType: "application/json",
            value: { event: "APPROVED", ...(body === undefined ? {} : { body }) },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}
