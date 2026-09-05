import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type {
  CreateRepositoryOptions,
  RepositoryContainerData,
  RepositoryData,
} from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { type GiteaOperationIdentity, requestGiteaBody } from "../transport/response/mod.ts";
import { createGiteaInitialFiles, validateInitialFiles } from "./initial-files.ts";
import { currentUserName, requestOptions, validationError } from "./request-options.ts";

import { type AnyGiteaRepository, isGiteaRepositoryPayload } from "./validate-payload.ts";

import { normalizeGiteaRepository } from "./normalize-repository.ts";

/** Create a user- or organization-owned repository without enumerating either collection. */
export async function createGiteaRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  container: RepositoryContainerData<"gitea", TVersion>,
  name: string,
  options: CreateRepositoryOptions,
): Promise<RepositoryData<"gitea", TVersion>> {
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

  let operation: GiteaOperationIdentity;
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
        `cannot create a repository for Gitea user ${containerName}; authorize as that user`,
      );
    }
    operation = { universal: universalOperation, native: "createCurrentUserRepo" };
    execute = () => client.createCurrentUserRepo({ body }, requestOptions(options.signal));
  } else {
    throw validationError(
      context,
      "createRepository",
      `Gitea does not support repository container kind ${container.kind}`,
    );
  }

  const payload = await requestGiteaBody<AnyGiteaRepository, TVersion>(
    context,
    operation,
    execute,
    options.signal,
    isGiteaRepositoryPayload,
  );
  const created = normalizeGiteaRepository(context, client, payload);
  if (files.length > 0) {
    await createGiteaInitialFiles(
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
