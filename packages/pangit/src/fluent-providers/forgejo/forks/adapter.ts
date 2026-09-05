import { createForgejoFork, listForgejoForks } from "./operations.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<Adapter<V>, "listForks" | "createFork"> {
  return {
    listForks: (repository, request) => listForgejoForks(context, repository, request),
    createFork: (repository, options) => createForgejoFork(context, repository, options),
  };
}
