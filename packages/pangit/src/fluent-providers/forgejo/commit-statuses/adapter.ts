import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  getForgejoCommitStatus,
  listForgejoCommitStatuses,
  setForgejoCommitStatus,
} from "./operations.ts";
import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<Adapter<V>, "listCommitStatuses" | "getCommitStatus" | "setCommitStatus"> {
  return {
    listCommitStatuses: (repository, ref, request) =>
      listForgejoCommitStatuses(context, repository, ref, request),
    getCommitStatus: (repository, ref, options) =>
      getForgejoCommitStatus(context, repository, ref, options),
    setCommitStatus: (repository, ref, input, options) =>
      setForgejoCommitStatus(context, repository, ref, input, options),
  };
}
