import type { GiteaProviderTypes } from "../provider-types.ts";
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

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  requestGitea,
} from "../transport/response/mod.ts";
import { currentUserName, requestOptions, validationError } from "./request-options.ts";

import { requireRepositoryArray } from "./validate-payload.ts";
import { normalizeGiteaRepository } from "./normalize-repository.ts";

/** Read exactly one provider page from one already-resolved repository container. */
export async function listGiteaRepositories<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  container: RepositoryContainerData<"gitea", TVersion, GiteaProviderTypes>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryData<"gitea", TVersion, GiteaProviderTypes>>> {
  const cursorOperation = { universal: "listRepositories" } as const;
  const containerName = requireIdentity(container.name, "repository container name");
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation: cursorOperation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const input = { query: { page: cursor.page, limit } };
  let operation: GiteaOperationIdentity;
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
      `Gitea does not support repository container kind ${container.kind}`,
    );
  }

  const response = await requestGitea(context, operation, execute, request.signal);
  const payloads = requireRepositoryArray(
    response.body,
    context,
    operation.universal,
    response,
  );
  const repositories = payloads.map((payload) =>
    normalizeGiteaRepository(context, client, payload)
  );
  return createPage(
    repositories,
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}
