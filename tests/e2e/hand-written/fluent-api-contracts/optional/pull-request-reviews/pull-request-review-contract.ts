import {
  createClient,
  type FluentProvider,
  type ProviderVersion,
} from "../../../../../../packages/pangit/src/fluent-api/mod.ts";
import {
  OperationAbortedError,
  ValidationError,
} from "../../../../../../packages/pangit/src/fluent-api/adapter-contract/errors.ts";
import type { FluentApiContractResult, FluentApiRequestEvidence } from "../../contract-result.ts";
import { FluentApiRequestRecorder, proveRequestSequence } from "../../request-recorder.ts";
import type { PullRequestReviewContractFixtures } from "./pull-request-review-contract-fixtures.ts";

export type PullRequestReviewContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly fixtures: PullRequestReviewContractFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise pending and submitted review objects, separate from core approval shortcuts. */
export async function runPullRequestReviewContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: PullRequestReviewContractInput<TProvider, TVersion>,
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

  const passed = await t.step("shared-capability/pull-request-reviews", async () => {
    const git = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    }).auth.basic({
      username: input.fixtures.reviewer.username,
      password: input.fixtures.reviewer.password,
    }).authorize();
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const pullRequest = await repository.pullRequests.get(input.fixtures.pullRequestNumber);
    const reviews = repository.pullRequests.reviews(pullRequest);

    const support = await prove(
      "repository.pullRequests.reviews.support",
      [],
      () => Promise.resolve(reviews.support),
    );
    assert(support.supported, "Pull-request review objects are not advertised as supported");
    assert(support.operations.list === "one-page", "Review list is not advertised as one-page");
    assert(support.operations.get === "direct", "Review get is not advertised as direct");
    assertions.push("review-object capability support is static and request-free");

    const pending = await prove(
      "pullRequest.reviews.create",
      ["repoCreatePullReview"],
      () => reviews.create({ body: "PanGit E2E pending review" }).execute(),
    );
    assert(pending.id.trim().length > 0, "Pending review has no identity");
    assert(pending.state === "pending", "Pending review state was not normalized");
    assert(Object.isFrozen(pending), "Pull-request review entity is mutable");

    const direct = await prove(
      "pullRequest.reviews.get",
      ["repoGetPullReview"],
      () => reviews.get(pending.id),
    );
    assert(direct.id === pending.id, "Direct review lookup returned the wrong review");

    const page = await prove(
      "pullRequest.reviews.list",
      ["repoListPullReviews"],
      () => reviews.list({ limit: 2 }),
    );
    assert(page.items.length <= 2, "Review page exceeded the requested limit");
    assert(
      page.items.some((review) => review.id === pending.id),
      "Review page omitted known review",
    );
    assertions.push("create, direct get, and bounded list each use one provider operation");

    const nativeState = await prove(
      "pullRequestReview.native.gitea",
      [],
      () => pending.native.gitea(({ review }) => Promise.resolve(review.state)),
    );
    assert(nativeState === "PENDING", "Exact pending-review native payload was not retained");

    const approved = await prove(
      "pullRequest.reviews.submit",
      ["repoSubmitPullReview"],
      () => reviews.submit(pending, { event: "approve", body: "PanGit E2E approved" }),
    );
    assert(approved.id === pending.id, "Submitted review identity changed");
    assert(approved.state === "approved", "Approved review state was not normalized");
    assert(approved.providerState === "APPROVED", "Exact provider review state was not retained");
    assertions.push("submitting a known pending review is one direct mutation");

    let invalid = false;
    const invalidCapture = await recorder.capture(async () => {
      try {
        await reviews.get(" ");
      } catch (error) {
        invalid = error instanceof ValidationError && error.operation === "getPullRequestReview";
      }
    });
    requestEvidence.push(
      proveRequestSequence("pullRequest.reviews.get.invalidId", [], invalidCapture).evidence,
    );
    assert(invalid, "Blank review identity was not rejected locally");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await reviews.get(pending.id, { signal: controller.signal });
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("pullRequest.reviews.get.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "Review-object cancellation was not normalized");
    assertions.push("invalid and cancelled review lookups perform zero provider requests");
  });

  return Object.freeze({
    id: "shared-capability/pull-request-reviews",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
