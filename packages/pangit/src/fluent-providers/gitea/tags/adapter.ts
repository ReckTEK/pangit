import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { createGiteaTag, deleteGiteaTag, getGiteaTag, listGiteaTags } from "./operations.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<Adapter<V>, "listTags" | "getTag" | "createTag" | "deleteTag"> {
  return {
    listTags: (repository, request) => listGiteaTags(context, repository, request),
    getTag: (repository, name, options) => getGiteaTag(context, repository, name, options),
    createTag: (repository, input, options) => createGiteaTag(context, repository, input, options),
    deleteTag: (repository, tag, options) => deleteGiteaTag(context, repository, tag, options),
  };
}
