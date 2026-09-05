import type { ForgejoProviderTypes } from "../provider-types.ts";
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

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { type ForgejoOperationIdentity, requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { isPullRequestPayload, validationError } from "./validate-payload.ts";
import type { AnyForgejoPullRequest } from "./payload-types.ts";
import { normalizeForgejoPullRequest } from "./normalize-pull-request.ts";
import { headPart } from "./head-selector.ts";

/** Create a same-repository or fork pull request with an unambiguous Forgejo head encoding. */
export async function createForgejoPullRequest<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: CreatePullRequestInput,
  options: OperationOptions = {},
): Promise<PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "createPullRequest", native: "repoCreatePullRequest" } as const;
  const title = requireIdentity(input.title, "pull-request title");
  const base = requireIdentity(input.targetBranch, "pull-request target branch");
  const head = encodeCreateHead(context, repository, input.source, operation);
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoPullRequest, TVersion>(
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
  return normalizeForgejoPullRequest(client, payload);
}

function encodeCreateHead<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  target: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  source: PullRequestRef,
  operation: ForgejoOperationIdentity,
): string {
  const owner = headPart(source.owner, "pull-request source owner");
  const repository = headPart(source.repository, "pull-request source repository");
  const branch = headPart(source.branch, "pull-request source branch");
  if (owner === target.owner && repository === target.name) return branch;
  if (owner === target.owner) {
    throw validationError(
      context,
      operation,
      "Forgejo cannot encode a different source repository owned by the target owner",
    );
  }
  return `${owner}:${branch}`;
}
