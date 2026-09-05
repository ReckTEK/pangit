import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  CreateRepositoryOptions,
  RepositoryContainerData,
  RepositoryData,
} from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { type ForgejoOperationIdentity, requestForgejoBody } from "../transport/response/mod.ts";
import { createForgejoInitialFiles, validateInitialFiles } from "./initial-files.ts";
import { currentUserName, requestOptions, validationError } from "./request-options.ts";

import { type AnyForgejoRepository, isForgejoRepositoryPayload } from "./validate-payload.ts";

import { normalizeForgejoRepository } from "./normalize-repository.ts";

/** Create a user- or organization-owned repository without enumerating either collection. */
export async function createForgejoRepository<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  container: RepositoryContainerData<"forgejo", TVersion, ForgejoProviderTypes>,
  name: string,
  options: CreateRepositoryOptions,
): Promise<RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const universalOperation = "createRepository";
  const repositoryName = requireIdentity(name, "repository name");
  const containerName = requireIdentity(container.name, "repository container name");
  const files = validateInitialFiles(context, options.files ?? []);
  const initializeWithoutFiles = options.initialize === true && files.length === 0;
  const defaultBranch = options.defaultBranch === undefined
    ? undefined
    : requireIdentity(options.defaultBranch, "default branch");
  const client = await context.client();
  const body = {
    mediaType: "application/json" as const,
    value: {
      name: repositoryName,
      ...(options.description === undefined ? {} : { description: options.description }),
      ...(options.private === undefined ? {} : { private: options.private }),
      ...(initializeWithoutFiles ? { auto_init: true } : {}),
      ...(defaultBranch === undefined ? {} : { default_branch: defaultBranch }),
    },
  };

  let operation: ForgejoOperationIdentity;
  let execute: () => Promise<AnyRestResponse>;
  if (container.kind === "organization") {
    operation = { universal: universalOperation, native: "createOrgRepo" };
    execute = () =>
      client.createOrgRepo(
        { path: { org: containerName }, body },
        requestOptions(options.signal),
      );
  } else if (container.kind === "user") {
    if (currentUserName(context) !== containerName) {
      throw validationError(
        context,
        "createRepository",
        `cannot create a repository for Forgejo user ${containerName}; authorize as that user`,
      );
    }
    operation = { universal: universalOperation, native: "createCurrentUserRepo" };
    execute = () => client.createCurrentUserRepo({ body }, requestOptions(options.signal));
  } else {
    throw validationError(
      context,
      "createRepository",
      `Forgejo does not support repository container kind ${container.kind}`,
    );
  }

  const payload = await requestForgejoBody<AnyForgejoRepository, TVersion>(
    context,
    operation,
    execute,
    options.signal,
    isForgejoRepositoryPayload,
  );
  const created = normalizeForgejoRepository(context, client, payload);
  if (files.length > 0) {
    await createForgejoInitialFiles(
      context,
      client,
      created,
      files,
      defaultBranch ?? created.defaultBranch,
      options.initialCommitMessage,
      universalOperation,
      options.signal,
    );
  }
  return created;
}
