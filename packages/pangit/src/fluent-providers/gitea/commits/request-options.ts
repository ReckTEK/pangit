import {
  type CommitFacets,
  MAX_COMMIT_READ_CONCURRENCY,
} from "../../../fluent-api/adapter-contract/commits.ts";

import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

export function facetsQuery(facets: CommitFacets) {
  return {
    files: facets.files === true,
    stat: facets.stats === true,
    verification: facets.verification === true,
  };
}

export function boundedConcurrency(value?: number): number {
  const requested = requirePositiveInteger(value ?? MAX_COMMIT_READ_CONCURRENCY, "concurrency");
  if (requested > MAX_COMMIT_READ_CONCURRENCY) {
    throw new RangeError(`concurrency cannot exceed ${MAX_COMMIT_READ_CONCURRENCY}`);
  }
  return requested;
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
