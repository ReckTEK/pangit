import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  OperationAbortedError,
  ValidationError,
} from "../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../request-recorder.ts";
import type { CommitStatusContractFixtures } from "./commit-status-contract-fixtures.ts";

type CommitStatusContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: CommitStatusContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise direct status writes, one-page reads, and combined-by-ref semantics. */
export async function runCommitStatusContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: CommitStatusContractInput<TProvider, TVersion>,
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

  const passed = await t.step("core/commit-statuses", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );

    const pending = await prove(
      "setCommitStatus.commit",
      ["repoCreateStatus"],
      () =>
        repository.statuses.set({ kind: "commit", sha: input.fixtures.commitSha }, {
          context: "pangit/commit",
          state: "pending",
          description: "commit ref",
          targetUrl: "https://example.invalid/pangit/commit",
        }).execute(),
    );
    assert(
      pending.state === "pending" && pending.providerState === "pending" &&
        pending.context === "pangit/commit",
      "Pending commit status normalized incorrectly",
    );
    const success = await prove(
      "setCommitStatus.branch",
      ["repoCreateStatus"],
      () =>
        repository.statuses.set({ kind: "branch", name: input.fixtures.branch }, {
          context: "pangit/branch",
          state: "success",
        }).execute(),
    );
    assert(success.state === "success", "Branch-ref status normalized incorrectly");
    const failure = await prove(
      "setCommitStatus.tag",
      ["repoCreateStatus"],
      () =>
        repository.statuses.set({ kind: "tag", name: input.fixtures.tag }, {
          context: "pangit/tag",
          state: "failure",
        }).execute(),
    );
    assert(failure.state === "failure", "Tag-ref status normalized incorrectly");
    await prove(
      "setCommitStatus.pullRequestHead",
      ["repoGetPullRequest", "repoCreateStatus"],
      () =>
        repository.statuses.set({
          kind: "pullRequestHead",
          number: input.fixtures.pullRequestNumber,
        }, {
          context: "pangit/pr-head",
          state: "success",
        }).execute(),
    );
    const branchStatuses = await prove(
      "listCommitStatuses.branch",
      ["repoListStatusesByRef"],
      () => repository.statuses.list({ kind: "branch", name: input.fixtures.branch }),
    );
    assert(
      branchStatuses.items.some((status) => status.context === "pangit/branch"),
      "Explicit branch status reference did not resolve",
    );
    const tagStatus = await prove(
      "getCombinedCommitStatus.tag",
      ["repoGetCombinedStatusByRef"],
      () => repository.statuses.get({ kind: "tag", name: input.fixtures.tag }),
    );
    assert(
      tagStatus.statuses.some((status) => status.context === "pangit/tag"),
      "Explicit tag status reference did not resolve",
    );
    const pullRequestHeadStatuses = await prove(
      "listCommitStatuses.pullRequestHead",
      ["repoGetPullRequest", "repoListStatusesByRef"],
      () =>
        repository.statuses.list({
          kind: "pullRequestHead",
          number: input.fixtures.pullRequestNumber,
        }),
    );
    assert(
      pullRequestHeadStatuses.items.some((status) => status.context === "pangit/pr-head"),
      "Explicit pull-request-head status reference did not resolve",
    );
    assertions.push(
      "commit, branch, tag, and PR-head modes use direct refs or one direct PR-head lookup",
    );

    const firstPage = await prove(
      "listCommitStatuses",
      ["repoListStatusesByRef"],
      () =>
        repository.statuses.list(
          { kind: "commit", sha: input.fixtures.commitSha },
          { limit: 2 },
        ),
    );
    assert(firstPage.items.length <= 2, "Status list exceeded its requested page limit");
    if (firstPage.nextCursor !== undefined) {
      const secondPage = await prove(
        "listCommitStatuses.nextPage",
        ["repoListStatusesByRef"],
        () =>
          repository.statuses.list({ kind: "commit", sha: input.fixtures.commitSha }, {
            limit: 2,
            cursor: firstPage.nextCursor,
          }),
      );
      assert(secondPage.items.length <= 2, "Second status page exceeded its effective limit");
    }
    const completePage = await prove(
      "listCommitStatuses.providerState",
      ["repoListStatusesByRef"],
      () =>
        repository.statuses.list(
          { kind: "commit", sha: input.fixtures.commitSha },
          { limit: 20 },
        ),
    );
    const providerOnly = completePage.items.find((status) =>
      status.context === input.fixtures.providerOnlyContext
    );
    assert(providerOnly !== undefined, "Raw provider-only status fixture is missing");
    assert(
      providerOnly.state === undefined &&
        providerOnly.providerState === input.fixtures.providerOnlyState,
      "Provider-only status was collapsed into the portable state union",
    );
    assert(Object.isFrozen(providerOnly), "Commit-status entity is mutable");
    assertions.push("status pages are bounded and preserve provider-only states verbatim");

    const combined = await prove(
      "getCombinedCommitStatus",
      ["repoGetCombinedStatusByRef"],
      () => repository.statuses.get({ kind: "commit", sha: input.fixtures.commitSha }),
    );
    assert(combined.ref === input.fixtures.commitSha, "Combined status returned the wrong ref");
    assert(combined.statuses.length >= 4, "Combined status omitted known contexts");
    assert(Object.isFrozen(combined.statuses), "Combined status collection is mutable");
    assertions.push("status get means one direct combined-by-ref operation");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await repository.statuses.set({ kind: "commit", sha: input.fixtures.commitSha }, {
          context: " ",
          state: "success",
        }).execute();
      } catch (error) {
        invalid = error instanceof ValidationError && error.operation === "setCommitStatus";
      }
    });
    requestEvidence.push(
      proveRequestSequence("setCommitStatus.invalidContext", [], invalidCapture).evidence,
    );
    assert(invalid, "Blank status context was not rejected locally");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await repository.statuses.list(
          { kind: "commit", sha: input.fixtures.commitSha },
          { signal: controller.signal },
        );
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("listCommitStatuses.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Status-list cancellation was not normalized");
    assertions.push("invalid and cancelled status operations perform zero provider requests");
  });

  return Object.freeze({
    id: "core/commit-statuses",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
