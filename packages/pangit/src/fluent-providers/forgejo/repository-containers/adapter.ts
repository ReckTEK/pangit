import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { getForgejoRepositoryContainer, listForgejoRepositoryContainers } from "./operations.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<Adapter<V>, "listRepositoryContainers" | "getRepositoryContainer"> {
  return {
    listRepositoryContainers: (request) => listForgejoRepositoryContainers(context, request),
    getRepositoryContainer: (name, options) =>
      getForgejoRepositoryContainer(context, name, options),
  };
}
