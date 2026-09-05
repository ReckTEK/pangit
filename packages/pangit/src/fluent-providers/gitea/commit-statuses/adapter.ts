import type {} from "../registration.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  getGiteaCommitStatus,
  listGiteaCommitStatuses,
  setGiteaCommitStatus,
} from "./operations.ts";
import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<Adapter<V>, "listCommitStatuses" | "getCommitStatus" | "setCommitStatus"> {
  return {
    listCommitStatuses: (repository, ref, request) =>
      listGiteaCommitStatuses(context, repository, ref, request),
    getCommitStatus: (repository, ref, options) =>
      getGiteaCommitStatus(context, repository, ref, options),
    setCommitStatus: (repository, ref, input, options) =>
      setGiteaCommitStatus(context, repository, ref, input, options),
  };
}
