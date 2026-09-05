import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import type { CreateForkOptions } from "../../../fluent-api/adapter-contract/forks.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoRepositoryPayload } from "../native/ForgejoRepositoryNative.ts";
import { isForgejoRepositoryPayload, normalizeForgejoRepository } from "../repositories/mod.ts";
import {
  decodeForgejoPageCursor,
  forgejoPagination,
  pollForgejo,
  requestForgejo,
  requestOptionalForgejoBody,
} from "../transport/response/mod.ts";

type AnyForgejoRepository = ForgejoRepositoryPayload<ForgejoVersion>;

/** Read exactly one provider fork page. */
export async function listForgejoForks<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>>> {
  const operation = { universal: "listForks", native: "listForks" } as const;
  const path = repositoryPath(repository);
  const client = await context.client();
  const cursor = decodeForgejoPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestForgejo(
    context,
    operation,
    () =>
      client.listForks(
        {
          path,
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireRepositoryArray(context, operation.universal, response);
  return createPage(
    payloads.map((payload) => normalizeForgejoRepository(context, client, payload)),
    forgejoPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Create one fork, then poll only its known direct destination until it is usable. */
export async function createForgejoFork<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  options: CreateForkOptions<"forgejo", TVersion, ForgejoProviderTypes>,
): Promise<RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const createOperation = { universal: "createFork", native: "createFork" } as const;
  const readinessOperation = { universal: "createFork", native: "repoGet" } as const;
  const destinationName = requireIdentity(options.destination.name, "fork destination name");
  const forkName = requireIdentity(options.name ?? repository.name, "fork repository name");
  const source = repositoryPath(repository);
  const timeoutMs = requirePositiveInteger(options.timeoutMs ?? 10_000, "fork timeout");
  const intervalMs = requirePositiveInteger(options.pollIntervalMs ?? 200, "fork poll interval");
  const attempts = requirePositiveInteger(
    Math.floor(timeoutMs / intervalMs) + 1,
    "fork readiness attempts",
  );
  let organization: string | undefined;
  if (options.destination.kind === "organization") {
    organization = destinationName;
  } else if (options.destination.kind === "user") {
    if (optionalText(context.currentUser()?.login) !== destinationName) {
      throw validationError(
        context,
        `cannot fork into Forgejo user ${destinationName}; authorize as that user`,
      );
    }
  } else {
    throw validationError(
      context,
      `Forgejo does not support fork destination kind ${options.destination.kind}`,
    );
  }

  const client = await context.client();
  await requestForgejo(
    context,
    createOperation,
    () =>
      client.createFork(
        {
          path: source,
          body: {
            mediaType: "application/json",
            value: {
              name: forkName,
              ...(organization === undefined ? {} : { organization }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );

  return await pollForgejo(
    context,
    readinessOperation,
    { attempts, intervalMs, signal: options.signal },
    async () => {
      const payload = await requestOptionalForgejoBody<AnyForgejoRepository, TVersion>(
        context,
        readinessOperation,
        () =>
          client.repoGet(
            { path: { owner: destinationName, repo: forkName } },
            requestOptions(options.signal),
          ),
        options.signal,
        isForgejoRepositoryPayload,
      );
      return payload === undefined
        ? undefined
        : normalizeForgejoRepository(context, client, payload);
    },
  );
}

function requireRepositoryArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyForgejoRepository[] {
  if (Array.isArray(response.body) && response.body.every(isForgejoRepositoryPayload)) {
    return response.body;
  }
  throw new ProviderInvariantError(`${operation} returned malformed repository data`, {
    provider: "forgejo",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function validationError<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "forgejo",
    version: context.version,
    operation: "createFork",
  });
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

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
