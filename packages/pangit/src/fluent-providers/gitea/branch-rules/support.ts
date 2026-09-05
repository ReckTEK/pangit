import type { BranchRuleCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/branch-rules.ts";

export const giteaBranchRuleSupport = Object.freeze({
  configuredRules: Object.freeze({
    supported: true,
    operations: Object.freeze({
      list: "direct-bounded-result",
      get: "direct",
      create: "direct",
      update: "direct",
      delete: "direct",
    }),
  }),
  effectiveProtection: Object.freeze({ supported: true, get: "direct" }),
  orderedPriority: "provider-extension",
}) satisfies BranchRuleCapabilitySupport;
