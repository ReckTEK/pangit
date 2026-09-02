import type { AnyRestResponse } from "../../generated-rest-clients/runtime/mod.ts";
import {
  ProviderInvariantError,
  ValidationError,
} from "../../fluent-api/adapter-contract/errors.ts";
import { requireIdentity } from "../../fluent-api/adapter-contract/operation-options.ts";
import { createPage, type Page } from "../../fluent-api/adapter-contract/pagination.ts";
import type {
  CreateRepositoryOptions,
  InitialRepositoryFile,
  RepositoryContainerData,
  RepositoryData,
  RepositoryParentData,
} from "../../fluent-api/adapter-contract/repositories.ts";
import type { ResolvedPageRequest } from "../../fluent-api/adapter-contract/pagination.ts";
import type { OperationOptions } from "../../fluent-api/adapter-contract/operation-options.ts";
import type { GiteaAdapterContext } from "./GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "./native/GiteaEntityNative.ts";
import {
  createGiteaRepositoryNative,
  type GiteaRepositoryPayload,
} from "./native/GiteaRepositoryNative.ts";
import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "./response.ts";

type AnyGiteaRepository = GiteaRepositoryPayload<GiteaVersion>;

/** Read exactly one provider page from one already-resolved repository container. */
export async function listGiteaRepositories<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  container: RepositoryContainerData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryData<"gitea", TVersion>>> {
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

/** Fetch one repository by its known owner and name. */
export async function getGiteaRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  container: RepositoryContainerData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<RepositoryData<"gitea", TVersion>> {
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
  container: RepositoryContainerData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "findRepository",
    native: "repoGet",
  },
): Promise<RepositoryData<"gitea", TVersion> | undefined> {
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
  container: RepositoryContainerData<"gitea", TVersion>,
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

/** Rename one repository with one mutation and retain the complete returned provider payload. */
export async function renameGiteaRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  name: string,
  options: OperationOptions = {},
): Promise<RepositoryData<"gitea", TVersion>> {
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
  repository: RepositoryData<"gitea", TVersion>,
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

/** Normalize shared repository fields while retaining the exact generated payload. */
export function normalizeGiteaRepository<TVersion extends GiteaVersion>(
  _context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: AnyGiteaRepository,
): RepositoryData<"gitea", TVersion> {
  const name = requiredText(repository.name, "repository name");
  const fullName = optionalText(repository.full_name);
  const owner = optionalText(repository.owner?.login) ?? fullName?.split("/")[0];
  if (owner === undefined || owner.length === 0) {
    throw new TypeError(`repository ${name} has no owner`);
  }
  const parent = repository.parent === undefined
    ? undefined
    : normalizeParent(repository.parent as AnyGiteaRepository);

  return Object.freeze({
    id: requiredText(repository.id, `repository ${owner}/${name} id`),
    owner,
    name,
    fullName: fullName ?? `${owner}/${name}`,
    ...(optionalText(repository.description) === undefined
      ? {}
      : { description: optionalText(repository.description) }),
    ...(optionalText(repository.default_branch) === undefined
      ? {}
      : { defaultBranch: optionalText(repository.default_branch) }),
    ...(typeof repository.private === "boolean" ? { private: repository.private } : {}),
    ...(optionalText(repository.html_url) === undefined
      ? {}
      : { url: optionalText(repository.html_url) }),
    ...(parent === undefined ? {} : { parent }),
    native: createGiteaRepositoryNative({
      client,
      repository: repository as GiteaRepositoryPayload<TVersion>,
    }),
  });
}

function normalizeParent(repository: AnyGiteaRepository): RepositoryParentData<"gitea"> {
  const name = requiredText(repository.name, "fork parent repository name");
  const fullName = optionalText(repository.full_name);
  const owner = optionalText(repository.owner?.login) ?? fullName?.split("/")[0];
  if (owner === undefined || owner.length === 0) {
    throw new TypeError(`fork parent repository ${name} has no owner`);
  }
  const id = optionalText(repository.id);
  return Object.freeze({
    provider: "gitea",
    ...(id === undefined ? {} : { id }),
    owner,
    name,
    fullName: fullName ?? `${owner}/${name}`,
  });
}

async function createGiteaInitialFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  files: readonly InitialRepositoryFile[],
  branch: string | undefined,
  message: string | undefined,
  universalOperation: string,
  signal: AbortSignal | undefined,
): Promise<void> {
  const changes = files.map((file) => ({
    operation: "create" as const,
    path: file.path,
    content: encodeBase64(file.content),
  }));

  await requestGitea(
    context,
    { universal: universalOperation, native: "repoChangeFiles" },
    () =>
      client.repoChangeFiles(
        {
          path: { owner: repository.owner, repo: repository.name },
          body: {
            mediaType: "application/json",
            value: {
              files: changes,
              ...(branch === undefined ? {} : { branch }),
              ...(message === undefined ? {} : { message }),
            },
          },
        },
        requestOptions(signal),
      ),
    signal,
  );
}

function validateInitialFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  files: readonly InitialRepositoryFile[],
): readonly InitialRepositoryFile[] {
  const found = new Set<string>();
  for (const file of files) {
    const path = requireIdentity(file.path, "initial repository file path");
    if (
      path.startsWith("/") || path.endsWith("/") || path.includes("\\") ||
      path.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
    ) {
      throw validationError(context, "createRepository", `invalid initial file path ${path}`);
    }
    if (file.mode !== undefined && file.mode !== "create") {
      throw validationError(
        context,
        "createRepository",
        `unsupported initial file mode for ${path}`,
      );
    }
    if (found.has(path)) {
      throw validationError(context, "createRepository", `duplicate initial file path ${path}`);
    }
    found.add(path);
  }
  return Object.freeze([...files]);
}

function currentUserName<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
): string | undefined {
  return optionalText(context.currentUser()?.login);
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

/** Validate the fields required to normalize one generated repository payload. */
export function isGiteaRepositoryPayload(value: unknown): value is AnyGiteaRepository {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const repository = value as AnyGiteaRepository;
  const fullName = optionalText(repository.full_name);
  if (
    !hasText(repository.name) || !hasText(repository.id) ||
    (!hasText(repository.owner?.login) && !hasText(fullName?.split("/")[0]))
  ) return false;
  return repository.parent === undefined || isParentPayload(repository.parent);
}

function isParentPayload(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const repository = value as AnyGiteaRepository;
  const fullName = optionalText(repository.full_name);
  return hasText(repository.name) &&
    (hasText(repository.owner?.login) || hasText(fullName?.split("/")[0]));
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}

function requireRepositoryArray(
  value: unknown,
  context: GiteaAdapterContext<GiteaVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaRepository[] {
  if (Array.isArray(value) && value.every(isGiteaRepositoryPayload)) return value;
  throw new ProviderInvariantError(`${operation} returned malformed repository data`, {
    provider: "gitea",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function encodeBase64(content: string | Uint8Array): string {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let encoded = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    encoded += alphabet[first >> 2];
    encoded += alphabet[((first & 3) << 4) | (second === undefined ? 0 : second >> 4)];
    encoded += second === undefined
      ? "="
      : alphabet[((second & 15) << 2) | (third === undefined ? 0 : third >> 6)];
    encoded += third === undefined ? "=" : alphabet[third & 63];
  }
  return encoded;
}
