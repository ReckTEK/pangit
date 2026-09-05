import type { FluentClientCapabilitySupport } from "../../fluent-api/provider-registry.ts";
import type { PackageCapabilitySupport } from "../../fluent-api/adapter-contract/optional/packages.ts";

export const gitlabPackageSupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    "list-packages": "one-page",
    "list-versions": "one-page",
    "get-version": "bounded",
    "find-version": "bounded",
    "list-files": "bounded",
    "delete-version": "bounded",
    "delete-package": "bounded",
  }),
  upload: "native-only",
  download: "native-only",
  repositoryLinking: "native-only",
}) satisfies PackageCapabilitySupport;
export const gitlabClientCapabilitySupport = Object.freeze({
  currentUserProfile: Object.freeze({ supported: true, current: "direct" }),
  packages: gitlabPackageSupport,
  unsupportedOptionalCapabilities: Object.freeze({
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
  }),
}) satisfies FluentClientCapabilitySupport;
