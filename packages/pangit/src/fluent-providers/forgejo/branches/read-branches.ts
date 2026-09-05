import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import type {
  BranchData,
  ListBranchesRequest,
} from "../../../fluent-api/adapter-contract/branches.ts";

import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  decodeForgejoPageCursor,
  type ForgejoOperationIdentity,
  forgejoPagination,
  requestForgejo,
  requestForgejoBody,
  requestOptionalForgejoBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import {
  type AnyForgejoBranch,
  isBranchPayload,
  normalizeForgejoBranch,
  optionalText,
  requireBranchArray,
} from "./normalize-branch.ts";

/** Read one provider branch page; Forgejo filtering remains deliberately page-local. */
export async function listForgejoBranches<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  request: ListBranchesRequest,
  operation: ForgejoOperationIdentity = {
    universal: "listBranches",
    native: "repoListBranches",
  },
): Promise<Page<BranchData<"forgejo", TVersion>>> {
  const query = request.query === undefined
    ? undefined
    : requireIdentity(request.query, "branch query");
  const path = repositoryPath(repository);
  const client = await context.client();
  const cursor = decodeForgejoPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestForgejo(
    context,
    operation,
    () => listBranchPage(client, path, cursor.page, limit, request.signal),
    request.signal,
  );
  const payloads = requireBranchArray(context, operation.universal, response);
  const selected = query !== undefined
    ? payloads.filter((payload) =>
      optionalText((payload as AnyForgejoBranch).name)?.includes(query)
    )
    : payloads;
  return createPage(
    selected.map((payload) => normalizeForgejoBranch(client, payload as AnyForgejoBranch)),
    forgejoPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one branch directly. */
export async function getForgejoBranch<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<BranchData<"forgejo", TVersion>> {
  const operation = { universal: "getBranch", native: "repoGetBranch" } as const;
  const branchName = requireIdentity(name, "branch name");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoBranch, TVersion>(
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
  return normalizeForgejoBranch(client, payload);
}

/** Test one branch identity with one direct request and 404-only absence semantics. */
export async function forgejoBranchExists<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<boolean> {
  const operation = { universal: "branchExists", native: "repoGetBranch" } as const;
  const branchName = requireIdentity(name, "branch name");
  const path = repositoryPath(repository);
  const client = await context.client();
  return await requestOptionalForgejoBody<AnyForgejoBranch, TVersion>(
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

function listBranchPage<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  path: { readonly owner: string; readonly repo: string },
  page: number,
  limit: number,
  signal: AbortSignal | undefined,
): Promise<AnyRestResponse> {
  return client.repoListBranches({ path, query: { page, limit } }, requestOptions(signal));
}
