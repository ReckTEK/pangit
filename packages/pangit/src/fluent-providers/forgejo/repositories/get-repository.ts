import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  RepositoryContainerData,
  RepositoryData,
} from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  type ForgejoOperationIdentity,
  requestForgejoBody,
  requestOptionalForgejoBody,
} from "../transport/response/mod.ts";
import { requestOptions } from "./request-options.ts";
import { type AnyForgejoRepository, isForgejoRepositoryPayload } from "./validate-payload.ts";

import { normalizeForgejoRepository } from "./normalize-repository.ts";

/** Fetch one repository by its known owner and name. */
export async function getForgejoRepository<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  container: RepositoryContainerData<"forgejo", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<RepositoryData<"forgejo", TVersion>> {
  const operation = { universal: "getRepository", native: "repoGet" } as const;
  const repositoryName = requireIdentity(name, "repository name");
  const owner = requireIdentity(container.name, "repository owner");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRepository, TVersion>(
    context,
    operation,
    () =>
      client.repoGet(
        { path: { owner, repo: repositoryName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isForgejoRepositoryPayload,
  );
  return normalizeForgejoRepository(context, client, payload);
}

/** Fetch one repository by its known owner and name, translating only a confirmed 404. */
export async function findForgejoRepository<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  container: RepositoryContainerData<"forgejo", TVersion>,
  name: string,
  options: OperationOptions = {},
  operation: ForgejoOperationIdentity = {
    universal: "findRepository",
    native: "repoGet",
  },
): Promise<RepositoryData<"forgejo", TVersion> | undefined> {
  const repositoryName = requireIdentity(name, "repository name");
  const owner = requireIdentity(container.name, "repository owner");
  const client = await context.client();
  const payload = await requestOptionalForgejoBody<AnyForgejoRepository, TVersion>(
    context,
    operation,
    () =>
      client.repoGet(
        { path: { owner, repo: repositoryName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isForgejoRepositoryPayload,
  );
  return payload === undefined ? undefined : normalizeForgejoRepository(context, client, payload);
}

/** Test one repository identity with one direct request. */
export async function hasForgejoRepository<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  container: RepositoryContainerData<"forgejo", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<boolean> {
  return await findForgejoRepository(
    context,
    container,
    name,
    options,
    { universal: "hasRepository", native: "repoGet" },
  ) !== undefined;
}
