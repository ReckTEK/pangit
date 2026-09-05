import type { CiRunDiscoveryCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/ci-run-discovery.ts";

export const giteaCiRunDiscoverySupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    "get-workflow": "direct",
    "list-runs": "one-page",
    "get-run": "direct",
    "list-run-jobs": "one-page",
    "get-job": "direct",
    "find-run-artifact": "direct",
    "get-artifact": "direct",
  }),
  workflowListing: "native-only-unbounded",
  artifactListing: "native-only-unbounded",
  mutations: "native-only",
}) satisfies CiRunDiscoveryCapabilitySupport;
