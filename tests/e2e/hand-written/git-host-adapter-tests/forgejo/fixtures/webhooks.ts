import type { RepositoryWebhookContractFixtures } from "../../../fluent-api-contracts/optional/repository-webhooks/repository-webhook-contract-fixtures.ts";
import type { Cleanup } from "./types.ts";
import { requiredString } from "./values.ts";
export function createWebhookReceiver(
  prefix: string,
  timeoutMs: number,
  trackCleanup: (cleanup: Cleanup) => void,
  label: string,
): RepositoryWebhookContractFixtures["receiver"] {
  const key = `${prefix}-${requiredString(label, "webhook receiver label")}`;
  const journalUrl = new URL("http://webhook-journal:8080/events");
  journalUrl.searchParams.set("key", key);
  const targetUrl = new URL(
    `/hooks/${encodeURIComponent(key)}`,
    "http://webhook-journal:8080",
  ).href;
  const clear = async () => {
    const response = await fetch(journalUrl, {
      method: "DELETE",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status !== 204) {
      throw new Error(`Webhook journal cleanup failed with HTTP ${response.status}`);
    }
  };
  trackCleanup({ name: `webhook journal ${key}`, run: clear });
  return Object.freeze({
    targetUrl,
    clear,
    waitForEvent: async (event: string, timeoutMs: number) => {
      const expectedEvent = requiredString(event, "webhook event");
      if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) {
        throw new TypeError("Webhook wait timeout must be a positive safe integer");
      }
      const eventUrl = new URL(journalUrl);
      eventUrl.searchParams.set("event", expectedEvent);
      const deadline = Date.now() + timeoutMs;
      while (true) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) {
          throw new Error(`Webhook journal timed out waiting for ${expectedEvent}`);
        }
        const response = await fetch(eventUrl, {
          signal: AbortSignal.timeout(Math.min(timeoutMs, remaining)),
        });
        if (!response.ok) {
          throw new Error(`Webhook journal read failed with HTTP ${response.status}`);
        }
        const payload = await response.json() as { readonly events?: unknown };
        if (!Array.isArray(payload.events)) {
          throw new Error("Webhook journal returned malformed events");
        }
        const found = payload.events.find((value): value is { event: string; body: unknown } =>
          value !== null && typeof value === "object" &&
          (value as { event?: unknown }).event === expectedEvent && "body" in value
        );
        if (found !== undefined) return Object.freeze({ event: found.event, body: found.body });
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    },
  });
}
