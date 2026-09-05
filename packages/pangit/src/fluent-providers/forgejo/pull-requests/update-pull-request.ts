import type { ForgejoProviderTypes } from "../provider-types.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  PullRequestData,
  UpdatePullRequestInput,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejoBody } from "../transport/response/mod.ts";
import { isPullRequestPayload, validationError } from "./validate-payload.ts";
import { pullRequestPath, requestOptions } from "./request-options.ts";

import type { AnyForgejoPullRequest } from "./payload-types.ts";
import { normalizeForgejoPullRequest } from "./normalize-pull-request.ts";

/** Update only fields explicitly supplied by the caller. */
export async function updateForgejoPullRequest<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  pullRequest: PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: UpdatePullRequestInput,
  options: OperationOptions = {},
): Promise<PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "updatePullRequest", native: "repoEditPullRequest" } as const;
  if (
    input.title === undefined && input.description === undefined && input.targetBranch === undefined
  ) {
    throw validationError(context, operation, "pull-request update cannot be empty");
  }
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoEditPullRequest(
        {
          path: pullRequestPath(repository, pullRequest),
          body: {
            mediaType: "application/json",
            value: {
              ...(input.title === undefined
                ? {}
                : { title: requireIdentity(input.title, "pull-request title") }),
              ...(input.description === undefined ? {} : { body: input.description }),
              ...(input.targetBranch === undefined
                ? {}
                : { base: requireIdentity(input.targetBranch, "pull-request target branch") }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return normalizeForgejoPullRequest(client, payload);
}

/** Close one pull request directly through its edit endpoint. */
export async function closeForgejoPullRequest<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  pullRequest: PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>,
  options: OperationOptions = {},
): Promise<PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "closePullRequest", native: "repoEditPullRequest" } as const;
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoEditPullRequest(
        {
          path: pullRequestPath(repository, pullRequest),
          body: { mediaType: "application/json", value: { state: "closed" } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return normalizeForgejoPullRequest(client, payload);
}
