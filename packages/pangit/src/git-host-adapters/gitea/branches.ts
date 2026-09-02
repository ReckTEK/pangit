import type { RestClientTypeMap } from "../../generated-rest-clients/rest-client-type-map.ts";
import type { AnyRestResponse } from "../../generated-rest-clients/runtime/mod.ts";
import type {
  BranchData,
  BranchDivergence,
  BranchDivergenceData,
  CreateBranchInput,
  ListBranchDivergencesRequest,
  ListBranchesRequest,
} from "../../fluent-api/adapter-contract/branches.ts";
import {
  ProviderInvariantError,
  ValidationError,
} from "../../fluent-api/adapter-contract/errors.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../fluent-api/adapter-contract/operation-options.ts";
import type { OperationOptions } from "../../fluent-api/adapter-contract/operation-options.ts";
import { createPage, type Page } from "../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "./GiteaAdapterContext.ts";
import {
  createGiteaEntityNative,
  type GiteaClient,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "./native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  mapGiteaBounded,
  requestGitea,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "./response.ts";

type AnyGiteaBranch = GiteaEntityPayload<GiteaVersion, "branch">;

/** Read one provider branch page; Gitea 1.26 filtering remains deliberately page-local. */
export async function listGiteaBranches<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ListBranchesRequest,
  operation: GiteaOperationIdentity = {
    universal: "listBranches",
    native: "repoListBranches",
  },
): Promise<Page<BranchData<"gitea", TVersion>>> {
  const query = request.query === undefined
    ? undefined
    : requireIdentity(request.query, "branch query");
  const path = repositoryPath(repository);
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () => listBranchPage(context, client, path, cursor.page, limit, query, request.signal),
    request.signal,
  );
  const payloads = requireBranchArray(context, operation.universal, response);
  const selected = context.version === "1.26.4" && query !== undefined
    ? payloads.filter((payload) => optionalText((payload as AnyGiteaBranch).name)?.includes(query))
    : payloads;
  return createPage(
    selected.map((payload) => normalizeGiteaBranch(client, payload as AnyGiteaBranch)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one branch directly. */
export async function getGiteaBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<BranchData<"gitea", TVersion>> {
  const operation = { universal: "getBranch", native: "repoGetBranch" } as const;
  const branchName = requireIdentity(name, "branch name");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaBranch, TVersion>(
    context,
    operation,
    () =>
      client.repoGetBranch(
        { path: { ...path, branch: branchName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isBranchPayload,
  );
  return normalizeGiteaBranch(client, payload);
}

/** Test one branch identity with one direct request and 404-only absence semantics. */
export async function giteaBranchExists<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<boolean> {
  const operation = { universal: "branchExists", native: "repoGetBranch" } as const;
  const branchName = requireIdentity(name, "branch name");
  const path = repositoryPath(repository);
  const client = await context.client();
  return await requestOptionalGiteaBody<AnyGiteaBranch, TVersion>(
    context,
    operation,
    () =>
      client.repoGetBranch(
        { path: { ...path, branch: branchName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isBranchPayload,
  ) !== undefined;
}

/** Create one branch directly from the caller's explicit ref or SHA. */
export async function createGiteaBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CreateBranchInput,
  options: OperationOptions = {},
): Promise<BranchData<"gitea", TVersion>> {
  const operation = { universal: "createBranch", native: "repoCreateBranch" } as const;
  const name = requireIdentity(input.name, "new branch name");
  const source = requireIdentity(input.source, "branch source");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaBranch, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateBranch(
        {
          path,
          body: {
            mediaType: "application/json",
            value: { new_branch_name: name, old_ref_name: source },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isBranchPayload,
  );
  return normalizeGiteaBranch(client, payload);
}

/** Rename one non-default branch with the provider's direct 204 mutation. */
export async function renameGiteaBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  branch: BranchData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "renameBranch", native: "repoRenameBranch" } as const;
  assertMutableBranch(context, repository, branch, "renameBranch");
  const newName = requireIdentity(name, "renamed branch name");
  const path = repositoryPath(repository);
  const branchName = requireIdentity(branch.name, "branch name");
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoRenameBranch(
        {
          path: { ...path, branch: branchName },
          body: { mediaType: "application/json", value: { name: newName } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Delete one non-default branch directly. */
export async function deleteGiteaBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  branch: BranchData<"gitea", TVersion>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteBranch", native: "repoDeleteBranch" } as const;
  assertMutableBranch(context, repository, branch, "deleteBranch");
  const path = repositoryPath(repository);
  const branchName = requireIdentity(branch.name, "branch name");
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoDeleteBranch(
        { path: { ...path, branch: branchName } },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Count the two set differences with two count-only commit-list probes. */
export async function getGiteaBranchDivergence<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  base: string,
  head: string,
  options: OperationOptions = {},
  operation: GiteaOperationIdentity = {
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
export async function listGiteaBranchDivergences<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ListBranchDivergencesRequest,
): Promise<Page<BranchDivergenceData<"gitea", TVersion>>> {
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
  const branches = await listGiteaBranches(
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
  const items = await mapGiteaBounded(
    context,
    divergenceOperation,
    branches.items,
    Math.min(requestedConcurrency, 4),
    request.signal,
    async (branch, _index, workerSignal) =>
      Object.freeze({
        branch,
        divergence: await getGiteaBranchDivergence(
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

/** Normalize one exact generated branch payload. */
export function normalizeGiteaBranch<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  branch: AnyGiteaBranch,
): BranchData<"gitea", TVersion> {
  const name = requiredText(branch.name, "branch name");
  const sha = requiredText(branch.commit?.id, `branch ${name} commit SHA`);
  return Object.freeze({
    name,
    sha,
    ...(typeof branch.protected === "boolean" ? { protected: branch.protected } : {}),
    native: createGiteaEntityNative(
      "branch",
      client,
      branch as GiteaEntityPayload<TVersion, "branch">,
    ),
  });
}

function listBranchPage<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  path: { readonly owner: string; readonly repo: string },
  page: number,
  limit: number,
  query: string | undefined,
  signal: AbortSignal | undefined,
): Promise<AnyRestResponse> {
  if (context.version === "1.27.2") {
    return (client as RestClientTypeMap["gitea"]["1.27.2"]).repoListBranches(
      {
        path,
        query: { page, limit, ...(query === undefined ? {} : { q: query }) },
      },
      requestOptions(signal),
    );
  }
  return (client as RestClientTypeMap["gitea"]["1.26.4"]).repoListBranches(
    { path, query: { page, limit } },
    requestOptions(signal),
  );
}

async function probeCommitDifference<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  path: { readonly owner: string; readonly repo: string },
  include: string,
  exclude: string,
  operation: GiteaOperationIdentity,
  signal: AbortSignal | undefined,
): Promise<number> {
  const response = await requestGitea(
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
      provider: "gitea",
      version: context.version,
      operation: operation.universal,
      status: response.status,
      cause: response,
    });
  }
  return count;
}

function assertMutableBranch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  branch: BranchData<"gitea", TVersion>,
  operation: string,
): void {
  if (repository.defaultBranch !== undefined && branch.name === repository.defaultBranch) {
    throw new ValidationError(`cannot ${operation} for default branch ${branch.name}`, {
      provider: "gitea",
      version: context.version,
      operation,
    });
  }
}

function requireArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly unknown[] {
  if (Array.isArray(response.body)) return response.body;
  throw new ProviderInvariantError(`${operation} returned a non-array success body`, {
    provider: "gitea",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function requireBranchArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaBranch[] {
  if (Array.isArray(response.body) && response.body.every(isBranchPayload)) {
    return response.body;
  }
  throw new ProviderInvariantError(`${operation} returned malformed branch data`, {
    provider: "gitea",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

function isBranchPayload(value: unknown): value is AnyGiteaBranch {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const branch = value as AnyGiteaBranch;
  return hasText(branch.name) && hasText(branch.commit?.id);
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}
