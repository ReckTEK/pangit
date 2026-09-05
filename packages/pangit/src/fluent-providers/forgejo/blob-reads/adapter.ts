import type {} from "../registration.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  forgejoBlobReadSupport,
  getForgejoBlob,
  readForgejoBlob,
  readForgejoBlobBytes,
  readForgejoBlobJson,
  readForgejoBlobText,
} from "./operations.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
): Pick<
  Adapter<V>,
  "blobReadSupport" | "getBlob" | "readBlobBytes" | "readBlobText" | "readBlobJson" | "readBlob"
> {
  return {
    blobReadSupport: forgejoBlobReadSupport,
    getBlob: (repository, sha, options) => getForgejoBlob(context, repository, sha, options),
    readBlobBytes: (repository, sha, options) =>
      readForgejoBlobBytes(context, repository, sha, options),
    readBlobText: (repository, sha, options) =>
      readForgejoBlobText(context, repository, sha, options),
    readBlobJson: (repository, sha, options) =>
      readForgejoBlobJson(context, repository, sha, options),
    readBlob: (repository, sha, options) => readForgejoBlob(context, repository, sha, options),
  };
}
