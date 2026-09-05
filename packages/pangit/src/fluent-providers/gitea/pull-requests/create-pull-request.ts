import type { GiteaProviderTypes } from "../provider-types.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  CreatePullRequestInput,
  PullRequestData,
  PullRequestRef,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import { type GiteaOperationIdentity, requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { isPullRequestPayload, validationError } from "./validate-payload.ts";
import type { AnyGiteaPullRequest } from "./payload-types.ts";
import { normalizeGiteaPullRequest } from "./normalize-pull-request.ts";
import { headPart } from "./head-selector.ts";

/** Create a same-repository or fork pull request with an unambiguous Gitea head encoding. */
export async function createGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  input: CreatePullRequestInput,
  options: OperationOptions = {},
): Promise<PullRequestData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "createPullRequest", native: "repoCreatePullRequest" } as const;
  const title = requireIdentity(input.title, "pull-request title");
  const base = requireIdentity(input.targetBranch, "pull-request target branch");
  const head = encodeCreateHead(context, repository, input.source, operation);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoCreatePullRequest(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              title,
              base,
              head,
              ...(input.description === undefined ? {} : { body: input.description }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return normalizeGiteaPullRequest(client, payload);
}

function encodeCreateHead<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  target: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  source: PullRequestRef,
  operation: GiteaOperationIdentity,
): string {
  const owner = headPart(source.owner, "pull-request source owner");
  const repository = headPart(source.repository, "pull-request source repository");
  const branch = headPart(source.branch, "pull-request source branch");
  if (owner === target.owner && repository === target.name) return branch;
  if (owner === target.owner) {
    throw validationError(
      context,
      operation,
      "Gitea cannot encode a different source repository owned by the target owner",
    );
  }
  return `${owner}:${branch}`;
}
