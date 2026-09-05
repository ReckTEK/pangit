import type {} from "../registration.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { createGiteaRelease, deleteGiteaRelease, updateGiteaRelease } from "./mutate-releases.ts";

import {
  deleteGiteaReleaseAsset,
  updateGiteaReleaseAsset,
  uploadGiteaReleaseAsset,
} from "./mutate-assets.ts";
import { getGiteaRelease, getGiteaReleaseByTag, listGiteaReleases } from "./read-releases.ts";
import { getGiteaReleaseAsset, listGiteaReleaseAssets } from "./read-assets.ts";

import { giteaReleaseSupport } from "./support.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
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
    releaseSupport: giteaReleaseSupport,
    listReleases: (repository, request) => listGiteaReleases(context, repository, request),
    getRelease: (repository, id, options) => getGiteaRelease(context, repository, id, options),
    getReleaseByTag: (repository, tagName, options) =>
      getGiteaReleaseByTag(context, repository, tagName, options),
    createRelease: (repository, input, options) =>
      createGiteaRelease(context, repository, input, options),
    updateRelease: (repository, release, input, options) =>
      updateGiteaRelease(context, repository, release, input, options),
    deleteRelease: (repository, release, options) =>
      deleteGiteaRelease(context, repository, release, options),
    listReleaseAssets: (repository, release, options) =>
      listGiteaReleaseAssets(context, repository, release, options),
    getReleaseAsset: (repository, release, id, options) =>
      getGiteaReleaseAsset(context, repository, release, id, options),
    uploadReleaseAsset: (
      repository,
      release,
      input,
      options,
    ) => uploadGiteaReleaseAsset(context, repository, release, input, options),
    updateReleaseAsset: (
      repository,
      release,
      asset,
      input,
      options,
    ) => updateGiteaReleaseAsset(context, repository, release, asset, input, options),
    deleteReleaseAsset: (
      repository,
      release,
      asset,
      options,
    ) => deleteGiteaReleaseAsset(context, repository, release, asset, options),
  };
}
