import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  RepositoryWebhookData,
  RepositoryWebhookEvent,
} from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoRepositoryWebhookNative,
  type ForgejoRepositoryWebhookPayload,
} from "../native/ForgejoRepositoryWebhookNative.ts";

import { isWebhookPayload } from "./validate-payload.ts";
import { fromForgejoEvent } from "./events.ts";

export function normalizeForgejoRepositoryWebhook<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  payload: ForgejoRepositoryWebhookPayload<TVersion>,
): RepositoryWebhookData<"forgejo", TVersion, ForgejoProviderTypes> {
  if (!isWebhookPayload(payload)) throw new TypeError("malformed Forgejo webhook payload");
  const providerEvents = Object.freeze([...(payload.events ?? [])]);
  const events = Object.freeze(
    providerEvents.map(fromForgejoEvent).filter((event): event is RepositoryWebhookEvent =>
      event !== undefined
    ),
  );
  const providerContentType = payload.config?.content_type;
  return Object.freeze({
    id: String(payload.id),
    url: payload.config!.url,
    active: payload.active!,

    events,
    providerEvents,
    ...(providerContentType === "json" || providerContentType === "form"
      ? { contentType: providerContentType }
      : {}),
    ...(providerContentType === undefined ? {} : { providerContentType }),
    ...(payload.created_at === undefined ? {} : { createdAt: payload.created_at }),
    ...(payload.updated_at === undefined ? {} : { updatedAt: payload.updated_at }),
    native: createForgejoRepositoryWebhookNative({ client, repositoryWebhook: payload }),
  });
}
