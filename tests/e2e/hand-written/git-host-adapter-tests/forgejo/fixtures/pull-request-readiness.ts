import { waitForFixture } from "./wait-for-fixture.ts";
import { unwrapRestResponse } from "../../../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type { ForgejoClient, ForgejoRepositoryFixture, ForgejoVersion } from "./types.ts";
import { requiredString } from "./values.ts";
export async function waitForPullRequestMergeable<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  timeoutMs: number,
  repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
  number: number,
): Promise<void> {
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new TypeError("Forgejo fixture pull-request number is invalid");
  }
  const deadline = Date.now() + timeoutMs;
  let consecutiveReadyReads = 0;
  let readySince: number | undefined;
  while (true) {
    const payload = unwrapRestResponse(
      await client.repoGetPullRequest({
        path: { owner: repository.owner, repo: repository.name, index: number },
      }, { signal: AbortSignal.timeout(timeoutMs) }),
    ) as {
      readonly mergeable?: unknown;
      readonly merged?: unknown;
      readonly merge_base?: unknown;
      readonly head?: { readonly sha?: unknown };
    };
    const ready = payload.mergeable === true && payload.merged !== true &&
      typeof payload.merge_base === "string" && payload.merge_base.length > 0 &&
      typeof payload.head?.sha === "string" && payload.head.sha.length > 0 &&
      payload.head.sha !== payload.merge_base;
    if (ready) {
      readySince ??= Date.now();
      consecutiveReadyReads++;
    } else {
      readySince = undefined;
      consecutiveReadyReads = 0;
    }
    // Forgejo reports `mergeable: true` for the non-mergeable ancestor state and
    // can expose a cached value briefly before its merge worker settles. Check
    // the exact head/base relationship and require a short stable-ready window
    // so fixture setup cannot race the real operation under test.
    if (
      consecutiveReadyReads >= 3 && readySince !== undefined && Date.now() - readySince >= 2_000
    ) return;
    if (Date.now() >= deadline) {
      throw new Error(`Forgejo fixture pull request ${number} mergeability timed out`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

export async function waitForPullRequestSearch<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  timeoutMs: number,
  repository: Pick<ForgejoRepositoryFixture, "owner" | "name">,
  number: number,
  query: string,
): Promise<void> {
  await waitForFixture("pull-request search indexing", timeoutMs, async () => {
    const payload = unwrapRestResponse(
      await client.issueSearchIssues({
        query: {
          type: "pulls",
          q: requiredString(query, "pull-request search query"),
          owner: repository.owner,
          state: "open",
          page: 1,
          limit: 20,
        },
      }, { signal: AbortSignal.timeout(timeoutMs) }),
    ) as readonly {
      readonly number?: unknown;
      readonly repository?: { readonly full_name?: unknown; readonly name?: unknown };
    }[];
    return payload.some((issue) =>
        issue.number === number &&
        (issue.repository?.full_name === `${repository.owner}/${repository.name}` ||
          issue.repository?.name === repository.name)
      )
      ? true
      : undefined;
  });
}
