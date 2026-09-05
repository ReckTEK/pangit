import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { readFileOperations } from "./read-file.ts";
import { readFilesOperations } from "./read-files.ts";
import { directoryOperations } from "./read-directory.ts";
import { metadataOperations } from "./read-path-metadata.ts";
import { symlinkOperations } from "./read-symlink.ts";
import { submoduleOperations } from "./read-submodule.ts";
import { commitOperations } from "./commit-file-changes.ts";

export function content<V extends GitLabVersion>(c: GitLabAdapterContext<V>) {
  return {
    ...readFileOperations(c),
    ...readFilesOperations(c),
    ...directoryOperations(c),
    ...metadataOperations(c),
    ...symlinkOperations(c),
    ...submoduleOperations(c),
    ...commitOperations(c),
  };
}
