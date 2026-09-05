import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import type { BlobData } from "../../../fluent-api/adapter-contract/optional/blob-reads.ts";

import {
  createWebBlob,
  decodeContentText,
  parseContentJson,
  validateContentBlobOptions,
} from "../../../fluent-api/content-body.ts";
import { call, context, invalid, object, path } from "../transport/mod.ts";
import type { Adapter, Repo } from "../adapter.ts";
import { door } from "../native/door.ts";

import { decode } from "../content/encoding.ts";

export async function getBlob<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  sha: string,
  o: { signal?: AbortSignal } = {},
): Promise<BlobData<"gitlab", V>> {
  if (!/^[a-f0-9]{40}$/i.test(sha)) invalid(c, "getBlob", "Git blob ID must be a full SHA-1");
  const p = object(
    c,
    "getBlob",
    (await call(
      c,
      "getBlob",
      "getApiV4ProjectsIdRepositoryBlobsSha",
      { path: { ...path(r), sha } },
      o,
    )).body,
  );
  // GitLab's blob endpoint does not echo the requested SHA. Verify the decoded object hash.
  const bytes = await decode(c, p, sha);
  return Object.freeze({
    sha: sha.toLowerCase(),
    size: bytes.length,
    bytes,
    native: await door(c, "blob", p),
  });
}

export function blobOperations<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<
  Adapter<V>,
  "getBlob" | "readBlob" | "readBlobBytes" | "readBlobText" | "readBlobJson" | "blobReadSupport"
> {
  const ops: Pick<
    Adapter<V>,
    "getBlob" | "readBlob" | "readBlobBytes" | "readBlobText" | "readBlobJson" | "blobReadSupport"
  > = {
    blobReadSupport: Object.freeze({
      supported: true,
      operations: Object.freeze({
        get: "direct",
        readBytes: "direct",
        readText: "direct",
        readJson: "direct",
        readBlob: "direct",
      }),
    }),
    getBlob: (r, sha, o) => getBlob(c, r, sha, o),
    readBlobBytes: async (r, sha, o) => (await getBlob(c, r, sha, o)).bytes.slice(),
    readBlobText: async (r, sha, o) =>
      decodeContentText(await ops.readBlobBytes(r, sha, o), context(c, "readBlobText")),
    readBlobJson: async (r, sha, o) =>
      parseContentJson(await ops.readBlobBytes(r, sha, o), context(c, "readBlobJson")),
    readBlob: async (r, sha, o = {}) => {
      validateContentBlobOptions(o, context(c, "readBlob"));
      return createWebBlob(await getBlob(c, r, sha, o), o, context(c, "readBlob"));
    },
  };
  return ops;
}
