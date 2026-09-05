import type { CommitFileData } from "../../../fluent-api/adapter-contract/commits.ts";

import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { getForgejoCommit } from "./read-commits.ts";
import { invariant } from "./errors.ts";

/** Fetch one commit with files enabled and every unrelated expensive facet disabled. */
export async function listForgejoCommitFiles<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  sha: string,
  options: OperationOptions = {},
): Promise<readonly CommitFileData[]> {
  const operation = { universal: "listCommitFiles", native: "repoGetSingleCommit" } as const;
  const commit = await getForgejoCommit(context, repository, sha, {
    signal: options.signal,
    files: true,
    stats: false,
    verification: false,
  }, operation);
  if (commit.files === undefined) {
    throw invariant(context, operation, "commit file data was not returned", commit);
  }
  return commit.files;
}
