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
import type { PullRequestReviewsCommentsFixtures } from "./pull-request-contract-fixtures.ts";

type PullRequestReviewsCommentsContractInput<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = {
  readonly provider: TProvider;
  readonly version: TVersion;
  readonly apiUrl: string;
  readonly token: string;
  readonly fixtures: PullRequestReviewsCommentsFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Exercise publication-only reviewer, approval, text, and inline-comment actions. */
export async function runPullRequestReviewsCommentsContract<
  const TProvider extends FluentProvider,
  const TVersion extends ProviderVersion<TProvider>,
>(
  t: Deno.TestContext,
  input: PullRequestReviewsCommentsContractInput<TProvider, TVersion>,
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

  const passed = await t.step("core/pull-request-reviews-comments", async () => {
    const connection = await createClient(input.provider, input.version, {
      baseUrl: input.apiUrl,
      beforeRequest: recorder.beforeRequest,
    });
    const authorGit = await connection.auth.token(input.token);
    const authorRepository = await (await authorGit.container(input.fixtures.repository.owner))
      .repository(input.fixtures.repository.name);
    const authoredPullRequest = await authorRepository.pullRequests.get(input.fixtures.number);

    await prove(
      "requestPullRequestReviewers",
      ["repoCreatePullReviewRequests"],
      () =>
        authorRepository.pullRequests.requestReviewers(authoredPullRequest, [
          input.fixtures.reviewer.username,
        ]),
    );
    assertions.push("reviewer request is one direct action against the known PR");

    const reviewerGit = await connection.auth.basic({
      username: input.fixtures.reviewer.username,
      password: input.fixtures.reviewer.password,
    }).authorize();
    const reviewerRepository = await (await reviewerGit.container(input.fixtures.repository.owner))
      .repository(input.fixtures.repository.name);
    const reviewedPullRequest = await reviewerRepository.pullRequests.get(input.fixtures.number);
    await prove(
      "approvePullRequest",
      ["repoCreatePullReview"],
      () => reviewerRepository.pullRequests.approve(reviewedPullRequest, "PanGit E2E approval"),
    );
    assertions.push("approval publishes one direct completed review action");

    await prove(
      "publishPullRequestComment.text",
      ["issueCreateComment"],
      () =>
        reviewerRepository.pullRequests.comment(reviewedPullRequest, {
          body: "PanGit E2E text comment",
        }),
    );
    await prove(
      "publishPullRequestComment.newLine",
      ["repoCreatePullReview"],
      () =>
        reviewerRepository.pullRequests.comment(reviewedPullRequest, {
          body: "PanGit E2E new-line comment",
          position: { path: input.fixtures.changedPath, side: "new", line: 1 },
        }),
    );
    await prove(
      "publishPullRequestComment.oldLine",
      ["repoCreatePullReview"],
      () =>
        reviewerRepository.pullRequests.comment(reviewedPullRequest, {
          body: "PanGit E2E old-line comment",
          position: { path: input.fixtures.changedPath, side: "old", line: 1 },
        }),
    );
    assertions.push("text and old/new line comments each publish through one direct endpoint");

    let invalidReviewers = false;
    const reviewerCapture = await recorder.capture(async () => {
      try {
        await authorRepository.pullRequests.requestReviewers(authoredPullRequest, []);
      } catch (error) {
        invalidReviewers = error instanceof ValidationError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("requestPullRequestReviewers.empty", [], reviewerCapture).evidence,
    );
    assert(invalidReviewers, "Empty reviewer request was not rejected locally");

    let invalidLine = false;
    const lineCapture = await recorder.capture(async () => {
      try {
        await reviewerRepository.pullRequests.comment(reviewedPullRequest, {
          body: "invalid line",
          position: { path: input.fixtures.changedPath, side: "new", line: 0 },
        });
      } catch (error) {
        invalidLine = error instanceof RangeError || error instanceof ValidationError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("publishPullRequestComment.invalidLine", [], lineCapture).evidence,
    );
    assert(invalidLine, "Invalid inline-comment line was not rejected locally");

    const controller = new AbortController();
    controller.abort();
    let aborted = false;
    const abortCapture = await recorder.capture(async () => {
      try {
        await reviewerRepository.pullRequests.comment(
          reviewedPullRequest,
          { body: "cancelled comment" },
          { signal: controller.signal },
        );
      } catch (error) {
        aborted = error instanceof OperationAbortedError;
      }
    });
    requestEvidence.push(
      proveRequestSequence("publishPullRequestComment.preflightAbort", [], abortCapture).evidence,
    );
    assert(aborted, "PR comment cancellation was not normalized");
    assertions.push("invalid and cancelled review actions perform zero provider requests");
  });

  return Object.freeze({
    id: "core/pull-request-reviews-comments",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
