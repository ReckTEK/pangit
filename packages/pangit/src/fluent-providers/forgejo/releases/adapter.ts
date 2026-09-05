import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  createForgejoRelease,
  deleteForgejoRelease,
  updateForgejoRelease,
} from "./mutate-releases.ts";

import {
  deleteForgejoReleaseAsset,
  updateForgejoReleaseAsset,
  uploadForgejoReleaseAsset,
} from "./mutate-assets.ts";
import { getForgejoRelease, getForgejoReleaseByTag, listForgejoReleases } from "./read-releases.ts";
import { getForgejoReleaseAsset, listForgejoReleaseAssets } from "./read-assets.ts";

import { forgejoReleaseSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "releaseSupport"
  | "listReleases"
  | "getRelease"
  | "getReleaseByTag"
  | "createRelease"
  | "updateRelease"
  | "deleteRelease"
  | "listReleaseAssets"
  | "getReleaseAsset"
  | "uploadReleaseAsset"
  | "updateReleaseAsset"
  | "deleteReleaseAsset"
> {
  return {
    releaseSupport: forgejoReleaseSupport,
    listReleases: (repository, request) => listForgejoReleases(context, repository, request),
    getRelease: (repository, id, options) => getForgejoRelease(context, repository, id, options),
    getReleaseByTag: (repository, tagName, options) =>
      getForgejoReleaseByTag(context, repository, tagName, options),
    createRelease: (repository, input, options) =>
      createForgejoRelease(context, repository, input, options),
    updateRelease: (repository, release, input, options) =>
      updateForgejoRelease(context, repository, release, input, options),
    deleteRelease: (repository, release, options) =>
      deleteForgejoRelease(context, repository, release, options),
    listReleaseAssets: (repository, release, options) =>
      listForgejoReleaseAssets(context, repository, release, options),
    getReleaseAsset: (repository, release, id, options) =>
      getForgejoReleaseAsset(context, repository, release, id, options),
    uploadReleaseAsset: (
      repository,
      release,
      input,
      options,
    ) => uploadForgejoReleaseAsset(context, repository, release, input, options),
    updateReleaseAsset: (
      repository,
      release,
      asset,
      input,
      options,
    ) => updateForgejoReleaseAsset(context, repository, release, asset, input, options),
    deleteReleaseAsset: (
      repository,
      release,
      asset,
      options,
    ) => deleteForgejoReleaseAsset(context, repository, release, asset, options),
  };
}
