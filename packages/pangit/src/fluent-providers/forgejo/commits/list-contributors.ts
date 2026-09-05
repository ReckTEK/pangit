import { aggregateContributors } from "../../../fluent-api/adapter-contract/contributor-aggregation.ts";
import type {
  ContributorData,
  ListContributorsRequest,
} from "../../../fluent-api/adapter-contract/commits.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  resolveBoundedPageLimit,
  type ScanPage,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { decodeForgejoPageCursor } from "../transport/response/mod.ts";
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
  const limit = resolveBoundedPageLimit(
    request,
    decodeForgejoPageCursor(request.cursor, {
      version: context.version,
      operation,
    }).effectiveLimit,
    { provider: "forgejo", version: context.version, operation: operation.universal },
  );
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
      limit,
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
  return Object.freeze({
    items: aggregateContributors(page.items),
    ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
    complete: page.nextCursor === undefined,
  });
}
