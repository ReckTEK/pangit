import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { PullRequestData } from "../../../fluent-api/adapter-contract/pull-requests.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

export function pullRequestPath<TVersion extends GiteaVersion>(
  repository: RepositoryData<"gitea", TVersion>,
  pullRequest: PullRequestData<"gitea", TVersion>,
) {
  return {
    ...repositoryPath(repository),
    index: requirePositiveInteger(pullRequest.number, "pull-request number"),
  };
}

export function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

export function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}
