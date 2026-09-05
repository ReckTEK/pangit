import type { RepositoryWebhookEvent } from "../../../fluent-api/adapter-contract/optional/repository-webhooks.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoRepositoryWebhookPayload } from "../native/ForgejoRepositoryWebhookNative.ts";

export type AnyForgejoWebhook = ForgejoRepositoryWebhookPayload<ForgejoVersion>;

export function requireWebhookArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyForgejoWebhook[] {
  if (!Array.isArray(value) || !value.every(isWebhookPayload)) {
    throw new ProviderInvariantError("Forgejo returned a malformed webhook list", {
      provider: "forgejo",
      version: context.version,
      operation,
    });
  }
  return value;
}

export function isWebhookPayload(value: unknown): value is AnyForgejoWebhook {
  if (typeof value !== "object" || value === null) return false;
  const hook = value as AnyForgejoWebhook;
  return (typeof hook.id === "number" || typeof hook.id === "bigint") && hook.id > 0 &&
    typeof hook.active === "boolean" && typeof hook.config === "object" &&
    hook.config !== null && typeof hook.config.url === "string" &&
    (hook.events === undefined ||
      (Array.isArray(hook.events) && hook.events.every((event) => typeof event === "string")));
}

export function validateUrl(value: string | URL): string {
  const url = value instanceof URL
    ? new URL(value)
    : new URL(requireIdentity(value, "webhook URL"));
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new TypeError("webhook URL must be credential-free HTTP or HTTPS");
  }
  return url.href;
}

export function validateEvents(
  events: readonly RepositoryWebhookEvent[],
): readonly RepositoryWebhookEvent[] {
  if (events.length === 0) throw new RangeError("webhook events cannot be empty");
  const valid = new Set<RepositoryWebhookEvent>(["push", "pull-request", "issue", "release"]);
  for (const event of events) {
    if (!valid.has(event)) throw new TypeError(`unsupported webhook event: ${event}`);
  }
  return Object.freeze([...new Set(events)]);
}

export function parseForgejoId(value: string, name: string): bigint {
  const normalized = requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(normalized)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(normalized);
}
