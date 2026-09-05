import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  NotFoundError,
  OperationAbortedError,
} from "../../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { PullRequestDiscoveryFixtures } from "../../../../fluent-api-contracts/pull-requests/pull-request-contract-fixtures.ts";

type PullRequestDiscoveryContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: PullRequestDiscoveryFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise bounded PR discovery, direct identity reads, and one-page contents. */
export async function runPullRequestDiscoveryContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: PullRequestDiscoveryContractInput<TProvider, TVersion>,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();
  const prove = async <TValue>(
    operation: string,
    expected: readonly string[],
    action: () => Promise<TValue>,
  ): Promise<TValue> => {
    const proof = proveRequestSequence(operation, expected, await recorder.capture(action));
    requestEvidence.push(proof.evidence);
    return proof.value;
  };

  const passed = await t.step("core/pull-request-discovery", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );

    const firstPage = await prove(
      "listPullRequests",
      ["repoListPullRequests"],
      () => repository.pullRequests.list({ state: "open", limit: 1 }),
    );
    assert(firstPage.items.length === 1, "Pull-request page did not honor limit 1");
    assert(Object.isFrozen(firstPage.items[0]), "Pull-request entity is mutable");
    assertions.push("pull-request listing preserves one bounded provider page");

    const filtered = await prove(
      "listPullRequests.filtered",
      ["issueSearchIssues", "repoGetPullRequest"],
      () =>
        repository.pullRequests.list({
          state: "open",
          base: input.fixtures.base,
          head: input.fixtures.sameRepository.branch,
          query: input.fixtures.sameRepository.title,
          limit: 10,
        }),
    );
    assert(
      filtered.items.some((pullRequest) =>
        pullRequest.number === input.fixtures.sameRepository.number
      ),
      "Bounded pull-request filters omitted the matching fixture",
    );

    const direct = await prove(
      "getPullRequest",
      ["repoGetPullRequest"],
      () => repository.pullRequests.get(input.fixtures.sameRepository.number),
    );
    assert(
      direct.source.owner === input.fixtures.sameRepository.owner &&
        direct.source.repository === input.fixtures.sameRepository.repository &&
        direct.source.branch === input.fixtures.sameRepository.branch &&
        direct.source.sha === input.fixtures.sameRepository.sha,
      "Same-repository source identity normalized incorrectly",
    );
    assert(direct.target.branch === input.fixtures.base, "Target branch normalized incorrectly");

    const found = await prove(
      "findPullRequest",
      ["repoGetPullRequestByBaseHead"],
      () =>
        repository.pullRequests.find({
          base: input.fixtures.base,
          head: input.fixtures.sameRepository.branch,
        }),
    );
    assert(found?.number === direct.number, "Direct base/head lookup returned the wrong PR");

    const crossFork = await prove(
      "getPullRequest.crossFork",
      ["repoGetPullRequest"],
      () => repository.pullRequests.get(input.fixtures.crossFork.number),
    );
    assert(
      crossFork.number === input.fixtures.crossFork.number &&
        crossFork.source.owner === input.fixtures.crossFork.owner &&
        crossFork.source.repository === input.fixtures.crossFork.repository &&
        crossFork.source.sha === input.fixtures.crossFork.sha,
      "Cross-fork source identity normalized incorrectly",
    );

    const absent = await prove(
      "findPullRequest.missing",
      ["repoGetPullRequestByBaseHead"],
      () =>
        repository.pullRequests.find({
          base: input.fixtures.base,
          head: `${input.fixtures.sameRepository.branch}-missing`,
        }),
    );
    assert(absent === undefined, "Missing base/head pair did not return undefined");

    let missing = false;
    try {
      await prove(
        "getPullRequest.missing",
        ["repoGetPullRequest"],
        () => repository.pullRequests.get(2_000_000_000),
      );
    } catch (error) {
      missing = error instanceof NotFoundError;
    }
    assert(missing, "Missing direct PR did not throw NotFoundError");
    assertions.push("get and base/head find are direct and preserve 404-only absence");

    assert(
      !await prove(
        "isPullRequestMerged.snapshot",
        [],
        () => repository.pullRequests.isMerged(direct),
      ),
      "Open PR snapshot reported merged",
    );
    assert(
      !await prove(
        "isPullRequestMerged.refresh",
        ["repoGetPullRequest"],
        () => repository.pullRequests.isMerged(direct, { refresh: true }),
      ),
      "Fresh merged-state lookup reported an open PR merged",
    );
    assertions.push("snapshot merge state is local and fresh merge state is one direct read");

    const commits = await prove(
      "listPullRequestCommits",
      ["repoGetPullRequestCommits"],
      () => repository.pullRequests.commits(direct, { limit: 1 }),
    );
    assert(commits.items.length === 1, "PR commit page did not honor limit 1");
    const files = await prove(
      "listPullRequestFiles",
      ["repoGetPullRequestFiles"],
      () => repository.pullRequests.files(direct, { limit: 1 }),
    );
    assert(files.items.length === 1, "PR file page did not honor limit 1");
    assert(
      files.items[0].path === input.fixtures.sameRepository.changedPath,
      "PR file page returned the wrong changed path",
    );
    assertions.push("PR commits and files each read exactly one provider page");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await repository.pullRequests.get(direct.number, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("getPullRequest.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Pull-request cancellation was not normalized");
  });

  return Object.freeze({
    id: "core/pull-request-discovery",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
