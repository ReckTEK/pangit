import type { UnsupportedOptionalCapabilityMap } from "../../fluent-api/adapter-contract/optional/unsupported-capabilities.ts";
export const gitlabUnsupportedOptionalCapabilities = Object.freeze({
  "deployments-environments": Object.freeze({
    supported: false,
    operations: Object.freeze([]),
    reason:
      "GitLab deployments and environments are available through native access; the shared fluent contract does not yet define this family",
  }),
  "gists-snippets": Object.freeze({
    supported: false,
    operations: Object.freeze([]),
    reason:
      "GitLab snippets are available through native access; the shared fluent contract does not yet define this family",
  }),
}) satisfies UnsupportedOptionalCapabilityMap;
