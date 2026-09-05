import type {} from "../registration.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { deleteForgejoPackage, deleteForgejoPackageVersion } from "./delete-packages.ts";

import {
  findForgejoPackageVersion,
  getForgejoPackageVersion,
  listForgejoPackages,
  listForgejoPackageVersions,
} from "./read-packages.ts";

import { forgejoPackageSupport } from "./support.ts";
import { listForgejoPackageFiles } from "./read-files.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
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
    packageSupport: forgejoPackageSupport,
    listPackages: (owner, request) => listForgejoPackages(context, owner, request),
    listPackageVersions: (coordinates, request) =>
      listForgejoPackageVersions(context, coordinates, request),
    getPackageVersion: (identity, options) => getForgejoPackageVersion(context, identity, options),
    findPackageVersion: (identity, options) =>
      findForgejoPackageVersion(context, identity, options),
    listPackageFiles: (identity, options) => listForgejoPackageFiles(context, identity, options),
    deletePackageVersion: (identity, options) =>
      deleteForgejoPackageVersion(context, identity, options),
    deletePackage: (coordinates, options) => deleteForgejoPackage(context, coordinates, options),
  };
}
