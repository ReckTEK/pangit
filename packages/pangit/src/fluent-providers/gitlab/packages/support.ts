import type { PackageCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/packages.ts";
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
