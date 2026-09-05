import type {
  ContributorData,
  ListContributorsRequest,
} from "../../../fluent-api/adapter-contract/commits.ts";

import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { ScanPage } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { validationError } from "./errors.ts";
import { listForgejoCommits } from "./read-commits.ts";

/** Aggregate one explicitly bounded commit-history slice by documented Git author identity. */
export async function listForgejoContributors<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  request: ListContributorsRequest,
): Promise<ScanPage<ContributorData>> {
  const operation = { universal: "listContributors", native: "repoGetAllCommits" } as const;
  if (
    request.maxItems === undefined && request.since === undefined && request.until === undefined
  ) {
    throw validationError(
      context,
      operation,
      "contributor aggregation requires maxItems, since, or until as an explicit history boundary",
    );
  }
  const maxItems = request.maxItems === undefined
    ? request.limit
    : requirePositiveInteger(request.maxItems, "maximum contributor history items");
  const ref = request.ref ?? repository.defaultBranch;
  if (ref === undefined) {
    throw validationError(
      context,
      operation,
      "repository has no known default branch; provide an explicit ref",
    );
  }
  const page = await listForgejoCommits(
    context,
    repository,
    {
      limit: Math.min(request.limit, maxItems),
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
      ...(request.signal === undefined ? {} : { signal: request.signal }),
      ref: requireIdentity(ref, "contributor history ref"),
      ...(request.since === undefined ? {} : { since: request.since }),
      ...(request.until === undefined ? {} : { until: request.until }),
      files: false,
      stats: false,
      verification: false,
    },
    operation,
  );
  const contributors = new Map<string, { name?: string; email?: string; commits: number }>();
  for (const commit of page.items) {
    const name = commit.author?.name;
    const email = commit.author?.email;
    if (name === undefined && email === undefined) continue;
    const key = email === undefined ? `name:${name}` : `email:${email.toLowerCase()}`;
    const contributor = contributors.get(key);
    if (contributor === undefined) contributors.set(key, { name, email, commits: 1 });
    else contributor.commits++;
  }
  return Object.freeze({
    items: Object.freeze(
      [...contributors.values()].map((contributor) => Object.freeze({ ...contributor })),
    ),
    ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
    complete: page.nextCursor === undefined,
  });
}
