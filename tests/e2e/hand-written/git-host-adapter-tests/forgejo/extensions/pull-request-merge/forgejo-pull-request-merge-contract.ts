import {
  createClient,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import {
  ConflictError,
  OperationTimeoutError,
} from "../../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { ForgejoPullRequestMergeFixtures } from "./forgejo-pull-request-merge-fixtures.ts";

export type ForgejoPullRequestMergeContractInput = {
  readonly version: ProviderVersion<"forgejo">;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: ForgejoPullRequestMergeFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Prove exact Forgejo merge controls and the optimistic head-SHA guard. */
export async function runForgejoPullRequestMergeContract(
  t: Deno.TestContext,
  input: ForgejoPullRequestMergeContractInput,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();
  const git = await (await createClient("forgejo", input.version, {
    baseUrl: input.apiUrl,
    beforeRequest: recorder.beforeRequest,
  })).auth.token(input.token);

  const passed = await t.step("forgejo-extension/pull-request-merge", async () => {
    const successRepository = await (await git.container(
      input.fixtures.success.repository.owner,
    )).repository(input.fixtures.success.repository.name);
    const successPullRequest = await successRepository.pullRequests.get(
      input.fixtures.success.number,
    );
    let callbackCount = 0;
    let extensionContext: unknown;
    const mergeTitle = "PanGit exact Forgejo merge title";
    const mergeMessage = "PanGit exact Forgejo merge message";
    const successCapture = await recorder.capture(() =>
      successRepository.pullRequests.merge(successPullRequest).forgejo((context) => {
        callbackCount++;
        extensionContext = context;
        return {
          method: "merge",
          forceMerge: false,
          headCommitId: input.fixtures.success.sourceSha,
          mergeTitle,
          mergeMessage,
        };
      }).execute()
    );
    const successProof = proveRequestSequence(
      "mergePullRequest.forgejoExtension",
      ["repoMergePullRequest", "repoGetPullRequest"],
      successCapture,
    );
    requestEvidence.push(successProof.evidence);
    const merged = successProof.value;
    assert(callbackCount === 1, "PR merge extension callback did not run exactly once");
    assert(
      JSON.stringify(extensionContext) === JSON.stringify({
        repositoryFullName: successRepository.fullName,
        pullRequestNumber: successPullRequest.number,
        sourceSha: input.fixtures.success.sourceSha,
      }),
      "PR merge extension received an unsafe or incorrect context",
    );
    assert(merged.merged && merged.mergeCommitSha !== undefined, "Forgejo merge did not complete");
    const commitCapture = await recorder.capture(() =>
      successRepository.commits.get(merged.mergeCommitSha!)
    );
    const commitProof = proveRequestSequence(
      "mergePullRequest.forgejoExtension.verifyMessage",
      ["repoGetSingleCommit"],
      commitCapture,
    );
    requestEvidence.push(commitProof.evidence);
    assert(
      commitProof.value.message.includes(mergeTitle) &&
        commitProof.value.message.includes(mergeMessage),
      "Forgejo exact merge title/message were not retained",
    );
    assertions.push("typed Forgejo merge options use one mutation plus one direct hydration");

    const staleRepository = await (await git.container(
      input.fixtures.staleHead.repository.owner,
    )).repository(input.fixtures.staleHead.repository.name);
    const stalePullRequest = await staleRepository.pullRequests.get(
      input.fixtures.staleHead.number,
    );
    let staleContext: unknown;
    const staleCapture = await recorder.capture(async () => {
      try {
        await staleRepository.pullRequests.merge(stalePullRequest).forgejo((context) => {
          staleContext = context;
          return {
            method: "merge",
            headCommitId: "0000000000000000000000000000000000000000",
          };
        }).execute();
        return undefined;
      } catch (error) {
        return error;
      }
    });
    const staleProof = proveRequestSequence(
      "mergePullRequest.forgejoExtension.staleHead",
      ["repoMergePullRequest"],
      staleCapture,
    );
    requestEvidence.push(staleProof.evidence);
    assert(staleProof.value instanceof ConflictError, "Stale Forgejo head guard did not conflict");
    assert(
      JSON.stringify(staleContext) === JSON.stringify({
        repositoryFullName: staleRepository.fullName,
        pullRequestNumber: stalePullRequest.number,
        sourceSha: input.fixtures.staleHead.sourceSha,
      }),
      "Stale-head extension received an incorrect context",
    );
    assertions.push("stale head SHA fails after one merge request without discovery or polling");

    if (input.fixtures.scheduled !== undefined) {
      const scheduledRepository = await (await git.container(
        input.fixtures.scheduled.repository.owner,
      )).repository(input.fixtures.scheduled.repository.name);
      const scheduledPullRequest = await scheduledRepository.pullRequests.get(
        input.fixtures.scheduled.number,
      );
      const scheduledCapture = await recorder.capture(async () => {
        try {
          await scheduledRepository.pullRequests.merge(scheduledPullRequest).forgejo(() => ({
            method: "merge",
            headCommitId: input.fixtures.scheduled!.sourceSha,
            mergeWhenChecksSucceed: true,
            scheduledCompletion: { attempts: 2, intervalMs: 0 },
          })).execute();
          return undefined;
        } catch (error) {
          return error;
        }
      });
      const scheduledProof = proveRequestSequence(
        "mergePullRequest.forgejoExtension.scheduledBound",
        ["repoMergePullRequest", "repoGetPullRequest", "repoGetPullRequest"],
        scheduledCapture,
      );
      requestEvidence.push(scheduledProof.evidence);
      assert(
        scheduledProof.value instanceof OperationTimeoutError,
        "Scheduled merge did not stop at its caller-selected polling bound",
      );
      assertions.push("scheduled merge polls only the known PR and stops at exactly two reads");
    }
  });

  return Object.freeze({
    id: "forgejo-extension/pull-request-merge",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
