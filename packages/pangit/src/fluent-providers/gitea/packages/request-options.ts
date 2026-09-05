import type {
  PackageCoordinates,
  PackageVersionIdentity,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import { requireGiteaPackageType } from "./support.ts";

export function packagePath(coordinates: PackageCoordinates) {
  return {
    owner: requireIdentity(coordinates.owner, "package owner"),
    type: requireGiteaPackageType(coordinates.type),
    name: requireIdentity(coordinates.name, "package name"),
  };
}

export function packageVersionPath(identity: PackageVersionIdentity) {
  return {
    ...packagePath(identity),
    version: requireIdentity(identity.version, "package version"),
  };
}

export function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}
