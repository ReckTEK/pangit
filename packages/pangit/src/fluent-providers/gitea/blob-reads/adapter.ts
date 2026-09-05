import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  getGiteaBlob,
  giteaBlobReadSupport,
  readGiteaBlob,
  readGiteaBlobBytes,
  readGiteaBlobJson,
  readGiteaBlobText,
} from "./operations.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<
  Adapter<V>,
  "blobReadSupport" | "getBlob" | "readBlobBytes" | "readBlobText" | "readBlobJson" | "readBlob"
> {
  return {
    blobReadSupport: giteaBlobReadSupport,
    getBlob: (repository, sha, options) => getGiteaBlob(context, repository, sha, options),
    readBlobBytes: (repository, sha, options) =>
      readGiteaBlobBytes(context, repository, sha, options),
    readBlobText: (repository, sha, options) =>
      readGiteaBlobText(context, repository, sha, options),
    readBlobJson: (repository, sha, options) =>
      readGiteaBlobJson(context, repository, sha, options),
    readBlob: (repository, sha, options) => readGiteaBlob(context, repository, sha, options),
  };
}
