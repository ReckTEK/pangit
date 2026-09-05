import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  IncompleteHistoryError,
  OperationAbortedError,
} from "../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
  type RequestCapture,
} from "../request-recorder.ts";
import type { CommitContractFixtures } from "./commit-contract-fixtures.ts";

type CommitContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: CommitContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise bounded commit, comparison, ancestry, ref, and contributor operations. */
export async function runCommitContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: CommitContractInput<TProvider, TVersion>,
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
  const recordChecked = <TValue>(operation: string, capture: RequestCapture<TValue>): TValue => {
    const expected = capture.requests.map((request) => request.operationId);
    requestEvidence.push(proveRequestSequence(operation, expected, capture).evidence);
    return capture.value;
  };

  const passed = await t.step("core/commits", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const owner = await git.container(input.fixtures.repository.owner);
    const repository = await owner.repository(input.fixtures.repository.name);

    const page = await prove(
      "listCommits",
      ["repoGetAllCommits"],
      () => repository.commits.list({ ref: input.fixtures.base, limit: 2 }),
    );
    assert(page.items.length <= 2, "Commit list exceeded its requested page");
    assert(page.items[0]?.files === undefined, "Default commit list loaded file facets");
    assert(page.items[0]?.additions === undefined, "Default commit list loaded statistics");
    assert(page.items[0]?.verified === undefined, "Default commit list loaded verification");
    assertions.push("commit listing fetches one page with expensive facets omitted by default");

    const commit = await prove(
      "getCommit",
      ["repoGetSingleCommit"],
      () => repository.commits.get(input.fixtures.baseSha),
    );
    assert(commit.sha === input.fixtures.baseSha, "Direct commit lookup returned the wrong SHA");
    const faceted = await prove(
      "getCommit.facets",
      ["repoGetSingleCommit"],
      () =>
        repository.commits.get(input.fixtures.baseSha, {
          files: true,
          stats: true,
          verification: true,
        }),
    );
    assert(
      faceted.files?.some((file) => file.path === input.fixtures.baseChangedPath),
      "Explicit commit file facet omitted the changed path",
    );
    assert(faceted.changedFiles !== undefined, "Explicit commit statistics were not normalized");
    assert(typeof faceted.verified === "boolean", "Explicit verification facet was not normalized");
    assertions.push("direct commit gets expose only explicitly requested facets");

    const many = await prove(
      "getCommits",
      ["repoGetSingleCommit", "repoGetSingleCommit"],
      () =>
        repository.commits.getMany(
          [input.fixtures.baseSha, input.fixtures.rootSha, input.fixtures.baseSha],
          { maxItems: 3, concurrency: 2 },
        ),
    );
    assert(
      many.map((item) => item.sha).join(",") ===
        [input.fixtures.baseSha, input.fixtures.rootSha, input.fixtures.baseSha].join(","),
      "Multi-commit get did not restore duplicate input order",
    );
    assertions.push("multi-get touches only unique requested SHAs with stable duplicate order");

    const comparison = await prove(
      "compareCommits",
      ["repoCompareDiff"],
      () => repository.commits.compare(input.fixtures.rootSha, input.fixtures.baseSha).execute(),
    );
    assert(
      comparison.commits.some((item) => item.sha === input.fixtures.baseSha),
      "Commit comparison omitted the ahead commit",
    );
    const files = await prove(
      "listCommitFiles",
      ["repoGetSingleCommit"],
      () => repository.commits.files(input.fixtures.baseSha),
    );
    assert(
      files.some((file) => file.path === input.fixtures.baseChangedPath),
      "Commit file listing omitted the changed path",
    );
    assertions.push("comparison and commit-file listing each use one direct provider request");

    const count = await prove(
      "countReachableCommits",
      ["repoGetAllCommits"],
      () => repository.commits.countReachable(input.fixtures.baseSha, input.fixtures.rootSha),
    );
    assert(count === 1, `Expected one reachable commit, received ${count}`);

    const mergeBaseCapture = await recorder.capture(() =>
      repository.commits.mergeBases(input.fixtures.baseSha, input.fixtures.headSha, {
        maxItems: 10,
        maxRequests: 24,
        concurrency: 2,
      })
    );
    assert(
      mergeBaseCapture.requests.length <= 24,
      `Merge-base traversal exceeded its documented bound: ${mergeBaseCapture.requests.length}`,
    );
    assert(
      mergeBaseCapture.requests.every((request) =>
        request.operationId === "repoGetAllCommits" ||
        request.operationId === "repoGetSingleCommit"
      ),
      "Merge-base traversal used an unrelated provider collection",
    );
    const mergeBases = recordChecked("findMergeBases", mergeBaseCapture);
    assert(
      mergeBases.commits.some((item) => item.sha === input.fixtures.rootSha),
      "Merge-base result omitted the known common ancestor",
    );
    assertions.push("reachable counts and merge bases remain explicitly bounded");

    const headRefs = await prove(
      "findRefsForCommit.head",
      ["repoListBranches"],
      () =>
        repository.commits.findRefs(input.fixtures.headSha, {
          kinds: ["branch"],
          match: "head",
          limit: 10,
        }),
    );
    assert(
      headRefs.items.some((ref) => ref.name === input.fixtures.head),
      "Head ref lookup omitted the exact branch",
    );

    const containsCapture = await recorder.capture(() =>
      repository.commits.findRefs(input.fixtures.rootSha, {
        kinds: ["branch"],
        match: "contains",
        limit: 2,
        maxItems: 2,
        maxCommitsPerRef: 10,
        concurrency: 2,
      })
    );
    assert(
      containsCapture.requests[0]?.operationId === "repoListBranches" &&
        containsCapture.requests.slice(1).every((request) =>
          request.operationId === "repoGetAllCommits"
        ) && containsCapture.requests.length <= 5,
      "Containment ref lookup exceeded one page plus bounded count probes",
    );
    const contains = recordChecked("findRefsForCommit.contains", containsCapture);
    assert(contains.items.length > 0, "Known ancestor was not contained by any candidate ref");
    assertions.push("ref discovery inspects one requested ref page and only its candidates");

    const contributors = await prove(
      "listContributors",
      ["repoGetAllCommits"],
      () =>
        repository.commits.contributors({
          ref: input.fixtures.base,
          limit: 3,
          maxItems: 3,
        }),
    );
    assert(contributors.items.length > 0, "Contributor slice returned no authors");
    assertions.push("contributor aggregation stops at its explicit history slice");

    let requestBudgetRejected = false;
    const requestBudgetCapture = await recorder.capture(async () => {
      try {
        await repository.commits.mergeBases(input.fixtures.baseSha, input.fixtures.headSha, {
          maxItems: 10,
          maxRequests: 1,
        });
      } catch (error) {
        requestBudgetRejected = error instanceof IncompleteHistoryError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("findMergeBases.insufficientRequestBudget", [], requestBudgetCapture)
        .evidence,
    );
    assert(requestBudgetRejected, "Insufficient merge-base request budget was not rejected");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await repository.commits.get(input.fixtures.baseSha, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("getCommit.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Commit cancellation was not normalized");
  });

  return Object.freeze({
    id: "core/commits",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
