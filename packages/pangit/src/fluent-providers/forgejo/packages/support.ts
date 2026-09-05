import type { PackageCapabilitySupport } from "../../../fluent-api/adapter-contract/optional/packages.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

const FORGEJO_PACKAGE_TYPES = Object.freeze(
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
    "vagrant",
  ] as const,
);

type ForgejoPackageType = (typeof FORGEJO_PACKAGE_TYPES)[number];

export const forgejoPackageSupport: PackageCapabilitySupport = Object.freeze({
  supported: true,
  operations: Object.freeze({
    "list-packages": "one-page",
    "list-versions": "one-page",
    "get-version": "direct",
    "find-version": "direct",
    "list-files": "direct-bounded-result",
    "delete-version": "direct",
    "delete-package": "bounded",
  }),
  upload: "native-only",
  download: "native-only",
  repositoryLinking: "native-only",
});

export function requireForgejoPackageType(value: string): ForgejoPackageType {
  const type = requireIdentity(value, "package type");
  if (!(FORGEJO_PACKAGE_TYPES as readonly string[]).includes(type)) {
    throw new TypeError(`unsupported Forgejo package type: ${type}`);
  }
  return type as ForgejoPackageType;
}
