import type { GiteaProviderTypes } from "../provider-types.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  RepositoryContainerData,
  RepositoryData,
} from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  type GiteaOperationIdentity,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "../transport/response/mod.ts";
import { requestOptions } from "./request-options.ts";
import { type AnyGiteaRepository, isGiteaRepositoryPayload } from "./validate-payload.ts";

import { normalizeGiteaRepository } from "./normalize-repository.ts";

/** Fetch one repository by its known owner and name. */
export async function getGiteaRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  container: RepositoryContainerData<"gitea", TVersion, GiteaProviderTypes>,
  name: string,
  options: OperationOptions = {},
): Promise<RepositoryData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "getRepository", native: "repoGet" } as const;
  const repositoryName = requireIdentity(name, "repository name");
  const owner = requireIdentity(container.name, "repository owner");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRepository, TVersion>(
    context,
    operation,
    () =>
      client.repoGet(
        { path: { owner, repo: repositoryName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isGiteaRepositoryPayload,
  );
  return normalizeGiteaRepository(context, client, payload);
}

/** Fetch one repository by its known owner and name, translating only a confirmed 404. */
export async function findGiteaRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  container: RepositoryContainerData<"gitea", TVersion, GiteaProviderTypes>,
  name: string,
  options: OperationOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "findRepository",
    native: "repoGet",
  },
): Promise<RepositoryData<"gitea", TVersion, GiteaProviderTypes> | undefined> {
  const repositoryName = requireIdentity(name, "repository name");
  const owner = requireIdentity(container.name, "repository owner");
  const client = await context.client();
  const payload = await requestOptionalGiteaBody<AnyGiteaRepository, TVersion>(
    context,
    operation,
    () =>
      client.repoGet(
        { path: { owner, repo: repositoryName } },
        requestOptions(options.signal),
      ),
    options.signal,
    isGiteaRepositoryPayload,
  );
  return payload === undefined ? undefined : normalizeGiteaRepository(context, client, payload);
}

/** Test one repository identity with one direct request. */
export async function hasGiteaRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  container: RepositoryContainerData<"gitea", TVersion, GiteaProviderTypes>,
  name: string,
  options: OperationOptions = {},
): Promise<boolean> {
  return await findGiteaRepository(
    context,
    container,
    name,
    options,
    { universal: "hasRepository", native: "repoGet" },
  ) !== undefined;
}
