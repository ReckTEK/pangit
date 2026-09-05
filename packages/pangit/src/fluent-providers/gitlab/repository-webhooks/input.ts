import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import type {
  RepositoryWebhookEvent,
  UpdateRepositoryWebhookInput,
} from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";

import { unavailable } from "../transport/mod.ts";
import { events } from "./normalize.ts";

export function hookInput(c: GitLabAdapterContext<GitLabVersion>, i: UpdateRepositoryWebhookInput) {
  if (i.active === false) {
    unavailable(c, "repositoryWebhooks", "GitLab has no portable enabled/disabled webhook toggle");
  }
  if (i.contentType && i.contentType !== "json") {
    unavailable(c, "repositoryWebhooks", "GitLab webhook payloads use JSON");
  }
  return {
    url: i.url?.toString(),
    name: i.name,
    ...(i.events
      ? Object.fromEntries(
        Object.entries(events).map((
          [key, value],
        ) => [value, i.events!.includes(key as RepositoryWebhookEvent)]),
      )
      : {}),
  };
}
