import type { GitLabProviderTypes } from "../provider-types.ts";
import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";
import type {
  ContentData,
  ReadContentOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import {
  createWebBlob,
  decodeContentText,
  parseContentJson,
  requireContentBytes,
  validateContentBlobOptions,
} from "../../../fluent-api/content-body.ts";
import { call, context, object, path, text } from "../transport/mod.ts";
import type { Adapter, Repo } from "../adapter.ts";
import { door } from "../native/door.ts";

import { normalizePath, pin } from "./paths.ts";

import { entry, tree, treeContent } from "./tree.ts";

import { getBlob } from "../blob-reads/adapter.ts";

export async function readContent<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
  r: Repo<V>,
  name: string,
  o: ReadContentOptions = {},
): Promise<ContentData<"gitlab", V, GitLabProviderTypes>> {
  name = normalizePath(c, name, true);
  const ref = await pin(c, r, o.ref, o);
  if (name === "") {
    const values = await tree(c, r, "", ref, o);
    return Object.freeze({
      kind: "directory",
      path: "",
      name: "",
      native: await door(c, "content", values),
    });
  }
  const p = await entry(c, r, name, ref, o);
  const meta = await treeContent(c, p);
  if (meta.kind === "directory" || meta.kind === "submodule") return meta;
  const blob = o.includeBytes !== false || meta.kind === "symlink"
    ? await getBlob(c, r, meta.sha!, o)
    : undefined;
  let lastCommitSha: string | undefined;
  if (o.includeCommitMetadata) {
    const f = object(
      c,
      "readContent",
      (await call(c, "readContent", "getApiV4ProjectsIdRepositoryFilesFilePath", {
        path: { ...path(r), file_path: name },
        query: { ref },
      }, o)).body,
    );
    lastCommitSha = text(f.last_commit_id);
  }
  return Object.freeze({
    ...meta,
    ...(meta.kind === "symlink"
      ? { target: decodeContentText(blob!.bytes, context(c, "readSymlink")) }
      : blob
      ? { bytes: blob.bytes, size: blob.size }
      : {}),
    lastCommitSha,
  });
}

export function readFileOperations<V extends GitLabVersion>(
  c: GitLabAdapterContext<V>,
): Pick<
  Adapter<V>,
  "readContent" | "readContentBytes" | "readContentText" | "readContentJson" | "readContentBlob"
> {
  const ops: Pick<
    Adapter<V>,
    "readContent" | "readContentBytes" | "readContentText" | "readContentJson" | "readContentBlob"
  > = {
    readContent: (r, p, o) => readContent(c, r, p, o),
    readContentBytes: async (r, p, o) =>
      requireContentBytes(
        await readContent(c, r, p, { ...o, includeBytes: true }),
        context(c, "readContentBytes"),
      ),
    readContentText: async (r, p, o) =>
      decodeContentText(await ops.readContentBytes(r, p, o), context(c, "readContentText")),
    readContentJson: async (r, p, o) =>
      parseContentJson(await ops.readContentBytes(r, p, o), context(c, "readContentJson")),
    readContentBlob: async (r, p, o = {}) => {
      validateContentBlobOptions(o, context(c, "readContentBlob"));
      return createWebBlob(
        await readContent(c, r, p, { ...o, includeBytes: true }),
        o,
        context(c, "readContentBlob"),
      );
    },
  };
  return ops;
}
