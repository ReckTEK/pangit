import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { deleteGiteaPackage, deleteGiteaPackageVersion } from "./delete-packages.ts";

import {
  findGiteaPackageVersion,
  getGiteaPackageVersion,
  listGiteaPackages,
  listGiteaPackageVersions,
} from "./read-packages.ts";

import { giteaPackageSupport } from "./support.ts";
import { listGiteaPackageFiles } from "./read-files.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "packageSupport"
  | "listPackages"
  | "listPackageVersions"
  | "getPackageVersion"
  | "findPackageVersion"
  | "listPackageFiles"
  | "deletePackageVersion"
  | "deletePackage"
> {
  return {
    packageSupport: giteaPackageSupport,
    listPackages: (owner, request) => listGiteaPackages(context, owner, request),
    listPackageVersions: (coordinates, request) =>
      listGiteaPackageVersions(context, coordinates, request),
    getPackageVersion: (identity, options) => getGiteaPackageVersion(context, identity, options),
    findPackageVersion: (identity, options) => findGiteaPackageVersion(context, identity, options),
    listPackageFiles: (identity, options) => listGiteaPackageFiles(context, identity, options),
    deletePackageVersion: (identity, options) =>
      deleteGiteaPackageVersion(context, identity, options),
    deletePackage: (coordinates, options) => deleteGiteaPackage(context, coordinates, options),
  };
}
