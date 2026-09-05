import type {
  RepositoryWebhookData,
  RepositoryWebhookEvent,
} from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaRepositoryWebhookNative,
  type GiteaRepositoryWebhookPayload,
} from "../native/GiteaRepositoryWebhookNative.ts";

import { isWebhookPayload } from "./validate-payload.ts";
import { fromGiteaEvent } from "./events.ts";

export function normalizeGiteaRepositoryWebhook<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaRepositoryWebhookPayload<TVersion>,
): RepositoryWebhookData<"gitea", TVersion> {
  if (!isWebhookPayload(payload)) throw new TypeError("malformed Gitea webhook payload");
  const providerEvents = Object.freeze([...(payload.events ?? [])]);
  const events = Object.freeze(
    providerEvents.map(fromGiteaEvent).filter((event): event is RepositoryWebhookEvent =>
      event !== undefined
    ),
  );
  const providerContentType = payload.config?.content_type;
  return Object.freeze({
    id: String(payload.id),
    url: payload.config!.url,
    active: payload.active!,
    ...(payload.name === undefined ? {} : { name: payload.name }),
    events,
    providerEvents,
    ...(providerContentType === "json" || providerContentType === "form"
      ? { contentType: providerContentType }
      : {}),
    ...(providerContentType === undefined ? {} : { providerContentType }),
    ...(payload.created_at === undefined ? {} : { createdAt: payload.created_at }),
    ...(payload.updated_at === undefined ? {} : { updatedAt: payload.updated_at }),
    native: createGiteaRepositoryWebhookNative({ client, repositoryWebhook: payload }),
  });
}
