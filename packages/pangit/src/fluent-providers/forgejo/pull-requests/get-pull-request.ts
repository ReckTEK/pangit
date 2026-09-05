import type { ForgejoProviderTypes } from "../provider-types.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  FindPullRequestInput,
  PullRequestData,
} from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  type ForgejoOperationIdentity,
  requestForgejoBody,
  requestOptionalForgejoBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { isPullRequestPayload } from "./validate-payload.ts";
import type { AnyForgejoPullRequest } from "./payload-types.ts";
import { normalizeForgejoPullRequest } from "./normalize-pull-request.ts";
import { validateHeadSelector } from "./head-selector.ts";

/** Fetch one pull request directly. */
export async function getForgejoPullRequest<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  number: number,
  options: OperationOptions = {},
  operation: ForgejoOperationIdentity = {
    universal: "getPullRequest",
    native: "repoGetPullRequest",
  },
): Promise<PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const index = requirePositiveInteger(number, "pull-request number");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoGetPullRequest(
        { path: { ...repositoryPath(repository), index } },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return normalizeForgejoPullRequest(client, payload);
}

/** Find one base/head pair with the provider's direct lookup and 404-only absence. */
export async function findForgejoPullRequest<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  input: FindPullRequestInput,
  options: OperationOptions = {},
): Promise<PullRequestData<"forgejo", TVersion, ForgejoProviderTypes> | undefined> {
  const operation = {
    universal: "findPullRequest",
    native: "repoGetPullRequestByBaseHead",
  } as const;
  const base = requireIdentity(input.base, "pull-request base branch");
  const head = validateHeadSelector(input.head);
  const client = await context.client();
  const payload = await requestOptionalForgejoBody<AnyForgejoPullRequest, TVersion>(
    context,
    operation,
    () =>
      client.repoGetPullRequestByBaseHead(
        { path: { ...repositoryPath(repository), base, head } },
        requestOptions(options.signal),
      ),
    options.signal,
    isPullRequestPayload,
  );
  return payload === undefined ? undefined : normalizeForgejoPullRequest(client, payload);
}

/** Return retained merge state, or explicitly refresh it with one direct lookup. */
export async function isForgejoPullRequestMerged<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  pullRequest: PullRequestData<"forgejo", TVersion, ForgejoProviderTypes>,
  refresh: boolean,
  options: OperationOptions = {},
): Promise<boolean> {
  if (!refresh) return pullRequest.merged;
  return (await getForgejoPullRequest(
    context,
    repository,
    pullRequest.number,
    options,
    { universal: "isPullRequestMerged", native: "repoGetPullRequest" },
  )).merged;
}
