import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityWebhooks = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const hook = await repo.webhooks.create({
    url: `http://webhook-journal:8080/hooks/${f.prefix}`,
    events: ["issue"],
    active: true,
    contentType: "json",
  });
  f.equal(
    (await f.prove(
      "Webhook lookup is direct",
      ["getApiV4ProjectsIdHooksHookId"],
      () => repo.webhooks.get(hook.id),
    )).events,
    ["issue"],
    "Webhook event mapping",
  );
  await repo.issues.create({ title: "Hook delivery" });
  await f.eventually(
    async () => {
      const r = await fetch(
        `http://webhook-journal:8080/events?key=${f.prefix}&event=Issue%20Hook`,
      );
      return await r.json() as { events: unknown[] };
    },
    (p) => p.events.length > 0,
    "actual webhook delivery",
  );
  f.assert(true, "Actual GitLab webhook received by isolated journal");
  const updated = await repo.webhooks.update(hook, { events: ["push", "issue"] });
  f.assert(updated.events.includes("push"), "Webhook update");
  await repo.webhooks.delete(updated);
  f.equal((await repo.webhooks.list()).items.length, 0, "Webhook deleted");
};
