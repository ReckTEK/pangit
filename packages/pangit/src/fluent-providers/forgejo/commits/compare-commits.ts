import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  CommitComparison,
  CompareCommitsOptions,
} from "../../../fluent-api/adapter-contract/commits.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoEntityPayload, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejoBody } from "../transport/response/mod.ts";

import { invariant } from "./errors.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { isCommitPayload, isRecord, optionalNonNegativeInteger } from "./validate-payload.ts";

import { normalizeForgejoCommit } from "./normalize-commit.ts";

/** Compare two refs with one provider request, retaining the native comparison semantics. */
export async function compareForgejoCommits<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  base: string,
  head: string,
  options: CompareCommitsOptions<"forgejo", TVersion, ForgejoProviderTypes> = {},
): Promise<CommitComparison<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "compareCommits", native: "repoCompareDiff" } as const;
  const baseRef = requireIdentity(base, "comparison base");
  const headRef = requireIdentity(head, "comparison head");
  const client = await context.client();
  const payload = await requestForgejoBody<Record<string, unknown>, TVersion>(
    context,
    operation,
    () =>
      client.repoCompareDiff(
        { path: { ...repositoryPath(repository), basehead: `${baseRef}...${headRef}` } },
        requestOptions(options.signal),
      ),
    options.signal,
    isRecord,
  );
  const commits = payload.commits;
  if (!Array.isArray(commits) || !commits.every(isCommitPayload)) {
    throw invariant(context, operation, "comparison returned malformed commits", payload);
  }
  const total = optionalNonNegativeInteger(payload.total_commits);
  if (payload.total_commits !== undefined && total === undefined) {
    throw invariant(
      context,
      operation,
      "comparison returned an invalid total commit count",
      payload,
    );
  }
  return Object.freeze({
    commits: Object.freeze(commits.map((commit) =>
      normalizeForgejoCommit(
        client,
        commit as ForgejoEntityPayload<TVersion, "commit">,
      )
    )),
    ...(total === undefined ? {} : { totalCommits: total }),
  });
}
