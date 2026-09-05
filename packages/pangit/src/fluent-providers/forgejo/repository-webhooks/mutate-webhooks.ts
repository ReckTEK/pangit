import type {
  CreateRepositoryWebhookInput,
  RepositoryWebhookData,
  UpdateRepositoryWebhookInput,
} from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requestForgejo, requestForgejoBody } from "../transport/response/mod.ts";
import {
  type AnyForgejoWebhook,
  isWebhookPayload,
  parseForgejoId,
  validateEvents,
  validateUrl,
} from "./validate-payload.ts";

import { repositoryPath, requestOptions } from "./request-options.ts";
import { toForgejoEvent } from "./events.ts";

import { normalizeForgejoRepositoryWebhook } from "./normalize.ts";

/** Create one portable JSON/form webhook; provider hook kinds remain internal. */
export async function createForgejoRepositoryWebhook<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  input: CreateRepositoryWebhookInput,
  options: OperationOptions = {},
): Promise<RepositoryWebhookData<"forgejo", TVersion>> {
  const operation = { universal: "createRepositoryWebhook", native: "repoCreateHook" } as const;
  const url = validateUrl(input.url);
  const events = validateEvents(input.events);
  const contentType = input.contentType ?? "json";
  const name = input.name === undefined ? undefined : requireIdentity(input.name, "webhook name");
  const secret = input.secret === undefined
    ? undefined
    : requireIdentity(input.secret, "webhook secret");
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoWebhook, TVersion>(
    context,
    operation,
    () =>
      client.repoCreateHook(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              type: "forgejo",
              active: input.active ?? true,
              ...(name === undefined ? {} : { name }),
              events: events.map(toForgejoEvent),
              config: {
                url,
                content_type: contentType,
                ...(secret === undefined ? {} : { secret }),
              },
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isWebhookPayload,
  );
  return normalizeForgejoRepositoryWebhook(client, payload);
}

/** Update one known webhook in one request, retaining its known URL when config changes. */
export async function updateForgejoRepositoryWebhook<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  webhook: RepositoryWebhookData<"forgejo", TVersion>,
  input: UpdateRepositoryWebhookInput,
  options: OperationOptions = {},
): Promise<RepositoryWebhookData<"forgejo", TVersion>> {
  const operation = { universal: "updateRepositoryWebhook", native: "repoEditHook" } as const;
  if (
    input.url === undefined && input.events === undefined && input.active === undefined &&
    input.name === undefined && input.contentType === undefined
  ) {
    throw new TypeError("webhook update must change at least one field");
  }
  const hookId = parseForgejoId(webhook.id, "webhook id");
  const updatesConfig = input.url !== undefined || input.contentType !== undefined;
  const events = input.events === undefined ? undefined : validateEvents(input.events);
  const name = input.name === undefined ? undefined : requireIdentity(input.name, "webhook name");
  const url = input.url === undefined ? webhook.url : validateUrl(input.url);
  const currentConfig = await webhook.native.forgejo(({ repositoryWebhook }) =>
    Object.freeze({ ...(repositoryWebhook.config ?? {}) })
  );
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoWebhook, TVersion>(
    context,
    operation,
    () =>
      client.repoEditHook(
        {
          path: {
            ...repositoryPath(repository),
            id: hookId,
          },
          body: {
            mediaType: "application/json",
            value: {
              ...(input.active === undefined ? {} : { active: input.active }),
              ...(name === undefined ? {} : { name }),
              ...(events === undefined ? {} : { events: events.map(toForgejoEvent) }),
              ...(updatesConfig
                ? {
                  config: {
                    ...currentConfig,
                    url,
                    content_type: input.contentType ?? webhook.providerContentType ?? "json",
                  },
                }
                : {}),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isWebhookPayload,
  );
  return normalizeForgejoRepositoryWebhook(client, payload);
}

/** Delete one known webhook without an existence preflight. */
export async function deleteForgejoRepositoryWebhook<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  webhook: RepositoryWebhookData<"forgejo", TVersion>,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deleteRepositoryWebhook", native: "repoDeleteHook" } as const;
  const hookId = parseForgejoId(webhook.id, "webhook id");
  const client = await context.client();
  await requestForgejo(
    context,
    operation,
    () =>
      client.repoDeleteHook(
        {
          path: {
            ...repositoryPath(repository),
            id: hookId,
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}
