import { createGiteaFork, listGiteaForks } from "./operations.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<Adapter<V>, "listForks" | "createFork"> {
  return {
    listForks: (repository, request) => listGiteaForks(context, repository, request),
    createFork: (repository, options) => createGiteaFork(context, repository, options),
  };
}
