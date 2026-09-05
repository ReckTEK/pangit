import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
if (repo.webhooks.support.supported) {
  const webhook = await repo.webhooks.create({
    url: "https://app.example.com/hooks/git",
    events: ["push", "pull-request"],
    contentType: "json",
  });
  console.log(webhook.id, webhook.events);
}

if (repo.branchRules.support.effectiveProtection.supported) {
  const protection = await repo.branchRules.effective("main");
  console.log(protection.protected, protection.requiredApprovals);
}
