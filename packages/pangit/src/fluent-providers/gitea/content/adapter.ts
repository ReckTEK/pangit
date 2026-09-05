import { commitGiteaFileChanges } from "./commit-file-changes.ts";
import { getGiteaDirectory, listGiteaDirectory } from "./read-directory.ts";

import {
  readGiteaContent,
  readGiteaContentBytes,
  readGiteaContentJson,
  readGiteaContentText,
} from "./read-file.ts";
import { readGiteaContentBlob } from "./read-blob.ts";

import { readGiteaFiles } from "./read-files.ts";
import { readGiteaPathMetadataBatch } from "./read-path-metadata.ts";
import { readGiteaSubmodule } from "./read-submodule.ts";
import { readGiteaSymlink } from "./read-symlink.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";

import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends GiteaVersion>(
  context: GiteaAdapterContext<V>,
): Pick<
  Adapter<V>,
  | "readContent"
  | "readContentBytes"
  | "readContentText"
  | "readContentJson"
  | "readContentBlob"
  | "readFiles"
  | "getDirectory"
  | "listDirectory"
  | "readPathMetadataBatch"
  | "readSymlink"
  | "readSubmodule"
  | "commitFileChanges"
> {
  return {
    readContent: (repository, path, options) =>
      readGiteaContent(context, repository, path, options),
    readContentBytes: (repository, path, options) =>
      readGiteaContentBytes(context, repository, path, options),
    readContentText: (repository, path, options) =>
      readGiteaContentText(context, repository, path, options),
    readContentJson: (repository, path, options) =>
      readGiteaContentJson(context, repository, path, options),
    readContentBlob: (repository, path, options) =>
      readGiteaContentBlob(context, repository, path, options),
    readFiles: (repository, paths, options) => readGiteaFiles(context, repository, paths, options),
    getDirectory: (repository, path, options) =>
      getGiteaDirectory(context, repository, path, options),
    listDirectory: (repository, path, options) =>
      listGiteaDirectory(context, repository, path, options),
    readPathMetadataBatch: (
      repository,
      paths,
      options,
    ) => readGiteaPathMetadataBatch(context, repository, paths, options),
    readSymlink: (repository, path, options) =>
      readGiteaSymlink(context, repository, path, options),
    readSubmodule: (repository, path, options) =>
      readGiteaSubmodule(context, repository, path, options),
    commitFileChanges: (repository, input, options) =>
      commitGiteaFileChanges(context, repository, input, options),
  };
}
