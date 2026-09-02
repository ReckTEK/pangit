import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../packages/pangit/src/fluent-api/mod.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../request-recorder.ts";
import type { PullRequestMergeFixtures } from "./pull-request-contract-fixtures.ts";

type PullRequestMergeContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: PullRequestMergeFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise terminal default/squash merges and explicit source-branch cleanup. */
export async function runPullRequestMergeContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: PullRequestMergeContractInput<TProvider, TVersion>,
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

  const passed = await t.step("core/pull-request-merge", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.token(input.token);
    const defaultRepository = await (await git.container(
      input.fixtures.defaultMerge.repository.owner,
    )).repository(
      input.fixtures.defaultMerge.repository.name,
    );

    const defaultCandidate = await defaultRepository.pullRequests.get(
      input.fixtures.defaultMerge.number,
    );
    const defaultMerged = await prove(
      "mergePullRequest.providerDefault",
      ["repoMergePullRequest", "repoGetPullRequest"],
      () =>
        defaultRepository.pullRequests.merge(defaultCandidate, {
          method: "provider-default",
          deleteSourceBranch: true,
        }).execute(),
    );
    assert(
      defaultMerged.merged && defaultMerged.state === "closed",
      "Provider-default merge did not return a merged snapshot",
    );
    assert(
      !await prove(
        "mergePullRequest.sourceCleanup",
        ["repoGetBranch"],
        () => defaultRepository.branches.exists(input.fixtures.defaultMerge.sourceBranch),
      ),
      "Requested source branch cleanup did not occur",
    );
    assertions.push("provider-default merge is one mutation plus one direct hydration");

    const squashRepository = await (await git.container(
      input.fixtures.squashMerge.repository.owner,
    )).repository(input.fixtures.squashMerge.repository.name);
    const squashCandidate = await squashRepository.pullRequests.get(
      input.fixtures.squashMerge.number,
    );
    const squashMerged = await prove(
      "mergePullRequest.squash",
      ["repoMergePullRequest", "repoGetPullRequest"],
      () => squashRepository.pullRequests.merge(squashCandidate, { method: "squash" }).execute(),
    );
    assert(
      squashMerged.merged && squashMerged.mergeCommitSha !== undefined,
      "Squash merge did not return its merged commit identity",
    );
    assert(
      await prove(
        "mergePullRequest.sourceRetained",
        ["repoGetBranch"],
        () => squashRepository.branches.exists(input.fixtures.squashMerge.sourceBranch),
      ),
      "Squash merge unexpectedly removed its source branch",
    );
    assertions.push("squash merge is terminal and does not poll or enumerate pull requests");
  });

  return Object.freeze({
    id: "core/pull-request-merge",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
