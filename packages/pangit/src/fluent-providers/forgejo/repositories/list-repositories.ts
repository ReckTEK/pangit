import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type {
  RepositoryContainerData,
  RepositoryData,
} from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  decodeForgejoPageCursor,
  type ForgejoOperationIdentity,
  forgejoPagination,
  requestForgejo,
} from "../transport/response/mod.ts";
import { currentUserName, requestOptions, validationError } from "./request-options.ts";

import { requireRepositoryArray } from "./validate-payload.ts";
import { normalizeForgejoRepository } from "./normalize-repository.ts";

/** Read exactly one provider page from one already-resolved repository container. */
export async function listForgejoRepositories<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  container: RepositoryContainerData<"forgejo", TVersion, ForgejoProviderTypes>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>>> {
  const cursorOperation = { universal: "listRepositories" } as const;
  const containerName = requireIdentity(container.name, "repository container name");
  const client = await context.client();
  const cursor = decodeForgejoPageCursor(request.cursor, {
    version: context.version,
    operation: cursorOperation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const input = { query: { page: cursor.page, limit } };
  let operation: ForgejoOperationIdentity;
  let execute: () => Promise<AnyRestResponse>;

  if (container.kind === "organization") {
    operation = { universal: "listRepositories", native: "orgListRepos" };
    execute = () =>
      client.orgListRepos(
        { path: { org: containerName }, ...input },
        requestOptions(request.signal),
      );
  } else if (container.kind === "user") {
    if (currentUserName(context) === containerName) {
      operation = { universal: "listRepositories", native: "userCurrentListRepos" };
      execute = () => client.userCurrentListRepos(input, requestOptions(request.signal));
    } else {
      operation = { universal: "listRepositories", native: "userListRepos" };
      execute = () =>
        client.userListRepos(
          { path: { username: containerName }, ...input },
          requestOptions(request.signal),
        );
    }
  } else {
    throw validationError(
      context,
      "listRepositories",
      `Forgejo does not support repository container kind ${container.kind}`,
    );
  }

  const response = await requestForgejo(context, operation, execute, request.signal);
  const payloads = requireRepositoryArray(
    response.body,
    context,
    operation.universal,
    response,
  );
  const repositories = payloads.map((payload) =>
    normalizeForgejoRepository(context, client, payload)
  );
  return createPage(
    repositories,
    forgejoPagination(context, operation, response, cursor, limit, payloads.length),
  );
}
