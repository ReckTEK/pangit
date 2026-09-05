import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const webhooks = {
  title: "repo.webhooks",
  source: "fluent-api/capabilities/optional/RepositoryWebhooks.ts",
  methods: {
    "list": "list(request?) \u2192 Page<RepositoryWebhook>. Fetch one page of configured hooks.",
    "get": "get(id, options?) \u2192 RepositoryWebhook. Fetch one hook.",
    "create":
      "create({ url, events, active?, name?, contentType?, secret? }, options?) \u2192 RepositoryWebhook. Secret is sent to the host and is not retained in the normalized entity.",
    "update":
      "update(webhook, { url?, events?, active?, name?, contentType? }, options?) \u2192 RepositoryWebhook. Secret rotation is a native operation.",
    "delete": "delete(webhook, options?) \u2192 void. Remove a hook.",
  } satisfies MethodDescriptions<api.RepositoryWebhooks<"gitea", "1.27.2">>,
};

export const rules = {
  title: "repo.branchRules",
  source: "fluent-api/capabilities/optional/RepositoryBranchRules.ts",
  methods: {
    "list":
      "list({ maxRules, signal? }) \u2192 readonly BranchRule[]. Bound the configured-rule result explicitly.",
    "get": "get(name, options?) \u2192 BranchRule. Fetch a configured rule by name.",
    "create":
      "create({ name, ...fields }, options?) \u2192 BranchRule. Create a policy supported by the selected provider.",
    "update": "update(rule, fields, options?) \u2192 BranchRule. Change supported policy fields.",
    "delete": "delete(rule, options?) \u2192 void. Delete a configured rule.",
    "effective":
      "effective(branch, options?) \u2192 EffectiveBranchProtection. Read enforcement for one concrete branch only when support.effectiveProtection.supported is true.",
    "setOrder":
      "setOrder() \u2192 operation. Use the supported provider extension to supply rule priorities, then execute. Unavailable on Forgejo and GitLab.",
  } satisfies MethodDescriptions<api.RepositoryBranchRules<"gitea", "1.27.2">>,
};
