import type { RepositoryWebhookData } from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyGiteaWebhook,
  isWebhookPayload,
  parseGiteaId,
  requireWebhookArray,
} from "./validate-payload.ts";
import { normalizeGiteaRepositoryWebhook } from "./normalize.ts";

/** Fetch exactly one requested page of repository webhooks. */
export async function listGiteaRepositoryWebhooks<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryWebhookData<"gitea", TVersion>>> {
  const operation = { universal: "listRepositoryWebhooks", native: "repoListHooks" } as const;
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
      client.repoListHooks(
        {
          path: repositoryPath(repository),
          query: { page: cursor.page, limit },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireWebhookArray(context, operation.universal, response.body);
  return createPage(
    payloads.map((payload) => normalizeGiteaRepositoryWebhook(client, payload)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one known webhook directly by exact ID. */
export async function getGiteaRepositoryWebhook<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  id: string,
  options: OperationOptions = {},
): Promise<RepositoryWebhookData<"gitea", TVersion>> {
  const operation = { universal: "getRepositoryWebhook", native: "repoGetHook" } as const;
  const hookId = parseGiteaId(id, "webhook id");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaWebhook, TVersion>(
    context,
    operation,
    () =>
      client.repoGetHook(
        { path: { ...repositoryPath(repository), id: hookId } },
        requestOptions(options.signal),
      ),
    options.signal,
    isWebhookPayload,
  );
  return normalizeGiteaRepositoryWebhook(client, payload);
}
