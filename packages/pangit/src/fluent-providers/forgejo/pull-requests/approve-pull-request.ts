import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejo } from "../transport/response/mod.ts";
import { pullRequestPath, requestOptions } from "./request-options.ts";

/** Publish an approval directly rather than creating and then submitting a pending review. */
export async function approveForgejoPullRequest<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  pullRequest: PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>,
  body?: string,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "approvePullRequest", native: "repoCreatePullReview" } as const;
  const client = await context.client();
  await requestForgejo(
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
