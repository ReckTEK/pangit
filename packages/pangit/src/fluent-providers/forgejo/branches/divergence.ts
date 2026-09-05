import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import type {
  BranchDivergence,
  BranchDivergenceData,
  ListBranchDivergencesRequest,
} from "../../../fluent-api/adapter-contract/branches.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  type ForgejoOperationIdentity,
  mapForgejoBounded,
  requestForgejo,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import { listForgejoBranches } from "./read-branches.ts";

/** Count the two set differences with two count-only commit-list probes. */
export async function getForgejoBranchDivergence<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  base: string,
  head: string,
  options: OperationOptions = {},
  operation: ForgejoOperationIdentity = {
    universal: "getDivergence",
    native: "repoGetAllCommits",
  },
): Promise<BranchDivergence> {
  const baseRef = requireIdentity(base, "divergence base");
  const headRef = requireIdentity(head, "divergence head");
  const path = repositoryPath(repository);
  const client = await context.client();
  const ahead = await probeCommitDifference(
    context,
    client,
    path,
    headRef,
    baseRef,
    operation,
    options.signal,
  );
  const behind = await probeCommitDifference(
    context,
    client,
    path,
    baseRef,
    headRef,
    operation,
    options.signal,
  );
  return Object.freeze({ ahead, behind, complete: true });
}

/** Derive divergence for one bounded branch page with stable output order and concurrency at most four. */
export async function listForgejoBranchDivergences<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  request: ListBranchDivergencesRequest,
): Promise<Page<BranchDivergenceData<"forgejo", TVersion, ForgejoProviderTypes>>> {
  const listOperation = {
    universal: "listBranchDivergences",
    native: "repoListBranches",
  } as const;
  const divergenceOperation = {
    universal: "listBranchDivergences",
    native: "repoGetAllCommits",
  } as const;
  const base = requireIdentity(request.base, "divergence base");
  const maxItems = requirePositiveInteger(
    request.maxItems ?? request.limit,
    "maximum branch items",
  );
  const requestedConcurrency = requirePositiveInteger(
    request.concurrency ?? 4,
    "branch concurrency",
  );
  const branches = await listForgejoBranches(
    context,
    repository,
    {
      limit: Math.min(request.limit, maxItems),
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
      ...(request.query === undefined ? {} : { query: request.query }),
      ...(request.signal === undefined ? {} : { signal: request.signal }),
    },
    listOperation,
  );
  const items = await mapForgejoBounded(
    context,
    divergenceOperation,
    branches.items,
    Math.min(requestedConcurrency, 4),
    request.signal,
    async (branch, _index, workerSignal) =>
      Object.freeze({
        branch,
        divergence: await getForgejoBranchDivergence(
          context,
          repository,
          base,
          branch.name,
          { signal: workerSignal },
          divergenceOperation,
        ),
      }),
  );
  return createPage(items, {
    ...(branches.nextCursor === undefined ? {} : { nextCursor: branches.nextCursor }),
    ...(branches.totalCount === undefined ? {} : { totalCount: branches.totalCount }),
  });
}

async function probeCommitDifference<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  client: ForgejoClient<TVersion>,
  path: { readonly owner: string; readonly repo: string },
  include: string,
  exclude: string,
  operation: ForgejoOperationIdentity,
  signal: AbortSignal | undefined,
): Promise<number> {
  const response = await requestForgejo(
    context,
    operation,
    () =>
      client.repoGetAllCommits(
        {
          path,
          query: {
            sha: include,
            not: exclude,
            page: 1,
            limit: 1,
            files: false,
            stat: false,
            verification: false,
          },
        },
        requestOptions(signal),
      ),
    signal,
  );
  requireArray(context, operation.universal, response);
  const raw = response.headers.get("x-total");
  const count = raw === null ? Number.NaN : Number(raw);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new ProviderInvariantError(`${operation.universal} returned an invalid X-Total header`, {
      provider: "forgejo",
      version: context.version,
      operation: operation.universal,
      status: response.status,
      cause: response,
    });
  }
  return count;
}

function requireArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly unknown[] {
  if (Array.isArray(response.body)) return response.body;
  throw new ProviderInvariantError(`${operation} returned a non-array success body`, {
    provider: "forgejo",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}
