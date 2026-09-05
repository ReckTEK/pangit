import type { PackageCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/packages.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

const GITEA_PACKAGE_TYPES = Object.freeze(
  [
    "alpine",
    "cargo",
    "chef",
    "composer",
    "conan",
    "conda",
    "container",
    "cran",
    "debian",
    "generic",
    "go",
    "helm",
    "maven",
    "npm",
    "nuget",
    "pub",
    "pypi",
    "rpm",
    "rubygems",
    "swift",
    "terraform",
    "vagrant",
  ] as const,
);

type GiteaPackageType = (typeof GITEA_PACKAGE_TYPES)[number];

export const giteaPackageSupport: PackageCapabilitySupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    "list-packages": "one-page",
    "list-versions": "one-page",
    "get-version": "direct",
    "find-version": "direct",
    "list-files": "direct-bounded-result",
    "delete-version": "direct",
    "delete-package": "direct",
  }),
  upload: "native-only",
  download: "native-only",
  repositoryLinking: "native-only",
});

export function requireGiteaPackageType(value: string): GiteaPackageType {
  const type = requireIdentity(value, "package type");
  if (!(GITEA_PACKAGE_TYPES as readonly string[]).includes(type)) {
    throw new TypeError(`unsupported Gitea package type: ${type}`);
  }
  return type as GiteaPackageType;
}
