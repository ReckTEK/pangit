import type { GiteaProviderTypes } from "../provider-types.ts";
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

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  type GiteaOperationIdentity,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { isPullRequestPayload } from "./validate-payload.ts";
import type { AnyGiteaPullRequest } from "./payload-types.ts";
import { normalizeGiteaPullRequest } from "./normalize-pull-request.ts";
import { validateHeadSelector } from "./head-selector.ts";

/** Fetch one pull request directly. */
export async function getGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  number: number,
  options: OperationOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "getPullRequest",
    native: "repoGetPullRequest",
  },
): Promise<PullRequestData<"gitea", TVersion, GiteaProviderTypes>> {
  const index = requirePositiveInteger(number, "pull-request number");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaPullRequest, TVersion>(
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
  return normalizeGiteaPullRequest(client, payload);
}

/** Find one base/head pair with the provider's direct lookup and 404-only absence. */
export async function findGiteaPullRequest<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  input: FindPullRequestInput,
  options: OperationOptions = {},
): Promise<PullRequestData<"gitea", TVersion, GiteaProviderTypes> | undefined> {
  const operation = {
    universal: "findPullRequest",
    native: "repoGetPullRequestByBaseHead",
  } as const;
  const base = requireIdentity(input.base, "pull-request base branch");
  const head = validateHeadSelector(input.head);
  const client = await context.client();
  const payload = await requestOptionalGiteaBody<AnyGiteaPullRequest, TVersion>(
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
  return payload === undefined ? undefined : normalizeGiteaPullRequest(client, payload);
}

/** Return retained merge state, or explicitly refresh it with one direct lookup. */
export async function isGiteaPullRequestMerged<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  pullRequest: PullRequestData<"gitea", TVersion, GiteaProviderTypes>,
  refresh: boolean,
  options: OperationOptions = {},
): Promise<boolean> {
  if (!refresh) return pullRequest.merged;
  return (await getGiteaPullRequest(
    context,
    repository,
    pullRequest.number,
    options,
    { universal: "isPullRequestMerged", native: "repoGetPullRequest" },
  )).merged;
}
