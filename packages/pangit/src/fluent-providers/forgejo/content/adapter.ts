import type {} from "../registration.ts";

import { commitForgejoFileChanges } from "./commit-file-changes.ts";
import { getForgejoDirectory, listForgejoDirectory } from "./read-directory.ts";

import {
  readForgejoContent,
  readForgejoContentBytes,
  readForgejoContentJson,
  readForgejoContentText,
} from "./read-file.ts";
import { readForgejoContentBlob } from "./read-blob.ts";

import { readForgejoFiles } from "./read-files.ts";
import { readForgejoPathMetadataBatch } from "./read-path-metadata.ts";
import { readForgejoSubmodule } from "./read-submodule.ts";
import { readForgejoSymlink } from "./read-symlink.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";

import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import type { Adapter } from "../adapter.ts";

export function createOperations<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
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
      readForgejoContent(context, repository, path, options),
    readContentBytes: (repository, path, options) =>
      readForgejoContentBytes(context, repository, path, options),
    readContentText: (repository, path, options) =>
      readForgejoContentText(context, repository, path, options),
    readContentJson: (repository, path, options) =>
      readForgejoContentJson(context, repository, path, options),
    readContentBlob: (repository, path, options) =>
      readForgejoContentBlob(context, repository, path, options),
    readFiles: (repository, paths, options) =>
      readForgejoFiles(context, repository, paths, options),
    getDirectory: (repository, path, options) =>
      getForgejoDirectory(context, repository, path, options),
    listDirectory: (repository, path, options) =>
      listForgejoDirectory(context, repository, path, options),
    readPathMetadataBatch: (
      repository,
      paths,
      options,
    ) => readForgejoPathMetadataBatch(context, repository, paths, options),
    readSymlink: (repository, path, options) =>
      readForgejoSymlink(context, repository, path, options),
    readSubmodule: (repository, path, options) =>
      readForgejoSubmodule(context, repository, path, options),
    commitFileChanges: (repository, input, options) =>
      commitForgejoFileChanges(context, repository, input, options),
  };
}
