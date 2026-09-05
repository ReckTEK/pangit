import type { GiteaProviderTypes } from "../provider-types.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requestGitea, requestGiteaBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyGiteaRepository, isGiteaRepositoryPayload } from "./validate-payload.ts";

import { normalizeGiteaRepository } from "./normalize-repository.ts";

/** Rename one repository with one mutation and retain the complete returned provider payload. */
export async function renameGiteaRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  name: string,
  options: OperationOptions = {},
): Promise<RepositoryData<"gitea", TVersion, GiteaProviderTypes>> {
  const operation = { universal: "renameRepository", native: "repoEdit" } as const;
  const repositoryName = requireIdentity(name, "repository name");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaRepository, TVersion>(
    context,
    operation,
    () =>
      client.repoEdit(
        {
          path,
          body: { mediaType: "application/json", value: { name: repositoryName } },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isGiteaRepositoryPayload,
  );
  return normalizeGiteaRepository(context, client, payload);
}

/** Delete one repository directly without an existence preflight. */
export async function deleteGiteaRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteRepository", native: "repoDelete" } as const;
  const path = repositoryPath(repository);
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.repoDelete(
        { path },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}
