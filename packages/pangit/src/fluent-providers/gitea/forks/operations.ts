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
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaRepositoryPayload } from "../native/GiteaRepositoryNative.ts";
import { isGiteaRepositoryPayload, normalizeGiteaRepository } from "../repositories/mod.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  pollGitea,
  requestGitea,
  requestOptionalGiteaBody,
} from "../transport/response/mod.ts";

type AnyGiteaRepository = GiteaRepositoryPayload<GiteaVersion>;

/** Read exactly one provider fork page. */
export async function listGiteaForks<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryData<"gitea", TVersion>>> {
  const operation = { universal: "listForks", native: "listForks" } as const;
  const path = repositoryPath(repository);
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
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
    payloads.map((payload) => normalizeGiteaRepository(context, client, payload)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Create one fork, then poll only its known direct destination until it is usable. */
export async function createGiteaFork<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  options: CreateForkOptions<"gitea", TVersion>,
): Promise<RepositoryData<"gitea", TVersion>> {
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
        `cannot fork into Gitea user ${destinationName}; authorize as that user`,
      );
    }
  } else {
    throw validationError(
      context,
      `Gitea does not support fork destination kind ${options.destination.kind}`,
    );
  }

  const client = await context.client();
  await requestGitea(
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

  return await pollGitea(
    context,
    readinessOperation,
    { attempts, intervalMs, signal: options.signal },
    async () => {
      const payload = await requestOptionalGiteaBody<AnyGiteaRepository, TVersion>(
        context,
        readinessOperation,
        () =>
          client.repoGet(
            { path: { owner: destinationName, repo: forkName } },
            requestOptions(options.signal),
          ),
        options.signal,
        isGiteaRepositoryPayload,
      );
      return payload === undefined ? undefined : normalizeGiteaRepository(context, client, payload);
    },
  );
}

function requireRepositoryArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaRepository[] {
  if (Array.isArray(response.body) && response.body.every(isGiteaRepositoryPayload)) {
    return response.body;
  }
  throw new ProviderInvariantError(`${operation} returned malformed repository data`, {
    provider: "gitea",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  message: string,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
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
