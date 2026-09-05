import type { GiteaProviderTypes } from "../provider-types.ts";
import { loadRestClientModule } from "../transport/create-rest-client.ts";

import type {
  CommitComparison,
  CompareCommitsOptions,
} from "../../../fluent-api/adapter-contract/commits.ts";
import type {
  GiteaCommitComparisonOutput,
  GiteaCompareCommitsExtension,
} from "../extensions/commits.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaEntityPayload, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { requestGiteaBody, requestGiteaText } from "../transport/response/mod.ts";

import { invariant, validationError } from "./errors.ts";
import { repositoryPath, requestOptions } from "./request-options.ts";

import { isCommitPayload, isRecord, optionalNonNegativeInteger } from "./validate-payload.ts";

import { normalizeGiteaCommit } from "./normalize-commit.ts";

/** Compare two refs with one provider request, including Gitea 1.27.2 raw diff/patch output. */
export async function compareGiteaCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  base: string,
  head: string,
  options: CompareCommitsOptions<"gitea", TVersion, GiteaProviderTypes> = {},
): Promise<CommitComparison<"gitea", TVersion, GiteaProviderTypes> | GiteaCommitComparisonOutput> {
  const operation = { universal: "compareCommits", native: "repoCompareDiff" } as const;
  const baseRef = requireIdentity(base, "comparison base");
  const headRef = requireIdentity(head, "comparison head");
  const client = await context.client();
  const extension = options.extension as GiteaCompareCommitsExtension | undefined;
  if (extension !== undefined) {
    if (extension.output !== "diff" && extension.output !== "patch") {
      throw validationError(
        context,
        operation,
        "raw comparison output must be diff or patch",
      );
    }
    if (context.version !== "1.27.2") {
      throw validationError(
        context,
        operation,
        "raw diff/patch comparison is available only on Gitea 1.27.2",
      );
    }
    const { giteaOperations } = await loadRestClientModule("1.27.2");
    const content = await requestGiteaText(
      context,
      operation,
      () =>
        client.rest.request(
          giteaOperations.repoCompareDiff,
          {
            path: { ...repositoryPath(repository), basehead: `${baseRef}...${headRef}` },
            query: { output: extension.output },
          },
          { ...requestOptions(options.signal), parseAs: "text" },
        ),
      options.signal,
    );
    return Object.freeze({ output: extension.output, content });
  }
  const payload = await requestGiteaBody<Record<string, unknown>, TVersion>(
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
      normalizeGiteaCommit(
        client,
        commit as GiteaEntityPayload<TVersion, "commit">,
      )
    )),
    ...(total === undefined ? {} : { totalCommits: total }),
  });
}
