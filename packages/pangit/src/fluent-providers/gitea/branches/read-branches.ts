import type { GiteaProviderTypes } from "../provider-types.ts";
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
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";
import {
  type AnyGiteaBranch,
  isBranchPayload,
  normalizeGiteaBranch,
  optionalText,
  requireBranchArray,
} from "./normalize-branch.ts";

/** Read one provider branch page; Gitea 1.26 filtering remains deliberately page-local. */
export async function listGiteaBranches<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  request: ListBranchesRequest,
  operation: GiteaOperationIdentity = {
    universal: "listBranches",
    native: "repoListBranches",
  },
): Promise<Page<BranchData<"gitea", TVersion, GiteaProviderTypes>>> {
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
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  name: string,
  options: OperationOptions = {},
): Promise<BranchData<"gitea", TVersion, GiteaProviderTypes>> {
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
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
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
    return (client as GiteaClient<"1.27.2">).repoListBranches(
      {
        path,
        query: { page, limit, ...(query === undefined ? {} : { q: query }) },
      },
      requestOptions(signal),
    );
  }
  return (client as GiteaClient<"1.26.4">).repoListBranches(
    { path, query: { page, limit } },
    requestOptions(signal),
  );
}
