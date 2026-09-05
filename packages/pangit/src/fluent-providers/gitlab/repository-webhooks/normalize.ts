import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import type {
  RepositoryWebhookData,
  RepositoryWebhookEvent,
} from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

import { type Dto, id, required, text } from "../transport/mod.ts";
import { door } from "../native/door.ts";

export const events = {
  push: "push_events",
  "pull-request": "merge_requests_events",
  issue: "issues_events",
  release: "releases_events",
} as const;

export async function hook<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  p: Dto,
): Promise<RepositoryWebhookData<"gitlab", V, GitLabProviderTypes>> {
  return Object.freeze({
    id: id(c, "normalizeWebhook", p.id),
    url: required(c, "normalizeWebhook", p.url),
    name: text(p.name),
    active: p.alert_status !== "disabled" && !p.disabled_until,
    events: Object.freeze(
      (Object.keys(events) as RepositoryWebhookEvent[]).filter((e) => p[events[e]] === true),
    ),
    providerEvents: Object.freeze(
      Object.keys(p).filter((k) => k.endsWith("_events") && p[k] === true),
    ),
    contentType: "json",
    providerContentType: "application/json",
    createdAt: text(p.created_at),
    native: await door(c, "repositoryWebhook", p),
  });
}
