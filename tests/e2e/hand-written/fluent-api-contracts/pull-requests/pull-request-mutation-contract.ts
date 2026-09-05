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
import type {
  PullRequestMutationFixtures,
  PullRequestSourceFixture,
} from "./pull-request-contract-fixtures.ts";

type PullRequestMutationContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: PullRequestMutationFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise same-repository/cross-fork creation, metadata mutation, and close. */
export async function runPullRequestMutationContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: PullRequestMutationContractInput<TProvider, TVersion>,
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
  const sourceInput = (source: PullRequestSourceFixture) => ({
    owner: source.owner,
    repository: source.repository,
    branch: source.branch,
    sha: source.sha,
  });

  const passed = await t.step("core/pull-request-mutation", async () => {
    const git = await (await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    })).auth.token(input.token);
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );

    const created = await prove(
      "createPullRequest.sameRepository",
      ["repoCreatePullRequest"],
      () =>
        repository.pullRequests.create({
          title: "PanGit same-repository PR",
          description: "original description",
          source: sourceInput(input.fixtures.sameRepository),
          targetBranch: input.fixtures.base,
        }),
    );
    assert(
      created.source.branch === input.fixtures.sameRepository.branch && created.state === "open",
      "Same-repository PR creation returned the wrong snapshot",
    );

    const updated = await prove(
      "updatePullRequest",
      ["repoEditPullRequest"],
      () =>
        repository.pullRequests.update(created, {
          title: "PanGit updated PR",
          description: "updated description",
        }),
    );
    assert(updated.title === "PanGit updated PR", "Updated PR title was not returned");
    assert(updated !== created && created.title !== updated.title, "PR mutation changed its input");
    assert(Object.isFrozen(updated), "Updated PR snapshot is mutable");

    const closed = await prove(
      "closePullRequest",
      ["repoEditPullRequest"],
      () => repository.pullRequests.close(updated),
    );
    assert(closed.state === "closed" && !closed.merged, "PR close returned invalid state");
    assertions.push("same-repository create, update, and close each use one direct mutation");

    const crossFork = await prove(
      "createPullRequest.crossFork",
      ["repoCreatePullRequest"],
      () =>
        repository.pullRequests.create({
          title: "PanGit cross-fork PR",
          source: sourceInput(input.fixtures.crossFork),
          targetBranch: input.fixtures.base,
        }),
    );
    assert(
      crossFork.source.owner === input.fixtures.crossFork.owner &&
        crossFork.source.repository === input.fixtures.crossFork.repository,
      "Cross-fork PR creation returned the wrong source",
    );
    assertions.push("cross-fork creation uses its explicit source identity without discovery");

    const closeCandidate = await prove(
      "createPullRequest.closeCandidate",
      ["repoCreatePullRequest"],
      () =>
        repository.pullRequests.create({
          title: "PanGit close candidate",
          source: sourceInput(input.fixtures.closeSource),
          targetBranch: input.fixtures.base,
        }),
    );

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await repository.pullRequests.update(closeCandidate, {});
      } catch (error) {
        invalid = error instanceof ValidationError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("updatePullRequest.empty", [], invalidCapture).evidence,
    );
    assert(invalid, "Empty PR update was not rejected locally");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await repository.pullRequests.close(closeCandidate, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("closePullRequest.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "PR close cancellation was not normalized");
    assertions.push("invalid and cancelled mutations perform zero provider requests");
  });

  return Object.freeze({
    id: "core/pull-request-mutation",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
