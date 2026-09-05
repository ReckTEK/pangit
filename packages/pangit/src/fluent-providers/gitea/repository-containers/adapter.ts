import type {} from "../registration.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { getGiteaRepositoryContainer, listGiteaRepositoryContainers } from "./operations.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<Adapter<V>, "listRepositoryContainers" | "getRepositoryContainer"> {
  return {
    listRepositoryContainers: (request) => listGiteaRepositoryContainers(context, request),
    getRepositoryContainer: (name, options) => getGiteaRepositoryContainer(context, name, options),
  };
}
