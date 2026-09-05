import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requestForgejo, requestForgejoBody } from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { type AnyForgejoRepository, isForgejoRepositoryPayload } from "./validate-payload.ts";

import { normalizeForgejoRepository } from "./normalize-repository.ts";

/** Rename one repository with one mutation and retain the complete returned provider payload. */
export async function renameForgejoRepository<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<RepositoryData<"forgejo", TVersion>> {
  const operation = { universal: "renameRepository", native: "repoEdit" } as const;
  const repositoryName = requireIdentity(name, "repository name");
  const path = repositoryPath(repository);
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoRepository, TVersion>(
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
    isForgejoRepositoryPayload,
  );
  return normalizeForgejoRepository(context, client, payload);
}

/** Delete one repository directly without an existence preflight. */
export async function deleteForgejoRepository<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteRepository", native: "repoDelete" } as const;
  const path = repositoryPath(repository);
  const client = await context.client();
  await requestForgejo(
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
