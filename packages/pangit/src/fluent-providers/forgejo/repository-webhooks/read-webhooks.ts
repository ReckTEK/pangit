import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { RepositoryWebhookData } from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  decodeForgejoPageCursor,
  forgejoPagination,
  requestForgejo,
  requestForgejoBody,
} from "../transport/response/mod.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import {
  type AnyForgejoWebhook,
  isWebhookPayload,
  parseForgejoId,
  requireWebhookArray,
} from "./validate-payload.ts";
import { normalizeForgejoRepositoryWebhook } from "./normalize.ts";

/** Fetch exactly one requested page of repository webhooks. */
export async function listForgejoRepositoryWebhooks<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  request: ResolvedPageRequest,
): Promise<Page<RepositoryWebhookData<"forgejo", TVersion, ForgejoProviderTypes>>> {
  const operation = { universal: "listRepositoryWebhooks", native: "repoListHooks" } as const;
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
    payloads.map((payload) => normalizeForgejoRepositoryWebhook(client, payload)),
    forgejoPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one known webhook directly by exact ID. */
export async function getForgejoRepositoryWebhook<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  id: string,
  options: OperationOptions = {},
): Promise<RepositoryWebhookData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "getRepositoryWebhook", native: "repoGetHook" } as const;
  const hookId = parseForgejoId(id, "webhook id");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoWebhook, TVersion>(
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
  return normalizeForgejoRepositoryWebhook(client, payload);
}
