import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  createForgejoTag,
  deleteForgejoTag,
  getForgejoTag,
  listForgejoTags,
} from "./operations.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<Adapter<V>, "listTags" | "getTag" | "createTag" | "deleteTag"> {
  return {
    listTags: (repository, request) => listForgejoTags(context, repository, request),
    getTag: (repository, name, options) => getForgejoTag(context, repository, name, options),
    createTag: (repository, input, options) =>
      createForgejoTag(context, repository, input, options),
    deleteTag: (repository, tag, options) => deleteForgejoTag(context, repository, tag, options),
  };
}
