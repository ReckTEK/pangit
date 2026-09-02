import {
  createClient,
  type ProviderVersion,
} from "../../../../../../../packages/pangit/src/fluent-api/mod.ts";
import type {
  RestRequestContext,
  RestRequestOperation,
} from "../../../../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type {
  FluentApiContractResult,
  FluentApiRequestEvidence,
} from "../../../../fluent-api-contracts/contract-result.ts";
import {
  FluentApiRequestRecorder,
  proveRequestSequence,
} from "../../../../fluent-api-contracts/request-recorder.ts";
import type { GiteaPullRequestReviewFixtures } from "./gitea-pull-request-review-fixtures.ts";

export type GiteaPullRequestReviewContractInput = {
  readonly version: ProviderVersion<"gitea">;
  readonly apiUrl: string;
  readonly fixtures: GiteaPullRequestReviewFixtures;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

/** Prove Gitea review events and grouped old/new inline coordinates through the fluent builder. */
export async function runGiteaPullRequestReviewContract(
  t: Deno.TestContext,
  input: GiteaPullRequestReviewContractInput,
): Promise<FluentApiContractResult> {
  const assertions: string[] = [];
  const requestEvidence: FluentApiRequestEvidence[] = [];
  const recorder = new FluentApiRequestRecorder();
  let submittedBody: unknown;
  const beforeRequest = async (
    request: Request,
    operation: RestRequestOperation,
    context: RestRequestContext,
  ): Promise<Request> => {
    recorder.beforeRequest(request, operation, context);
    if (operation.id === "repoCreatePullReview") submittedBody = await request.clone().json();
    return request;
  };

  const passed = await t.step("gitea-extension/pull-request-review", async () => {
    const git = await createClient("gitea", input.version, {
      baseUrl: input.apiUrl,
      beforeRequest,
    }).auth.basic({
      username: input.fixtures.reviewer.username,
      password: input.fixtures.reviewer.password,
    }).authorize();
    const repository = await (await git.container(input.fixtures.repository.owner)).repository(
      input.fixtures.repository.name,
    );
    const pullRequest = await repository.pullRequests.get(input.fixtures.pullRequestNumber);
    let callbackCount = 0;
    let extensionContext: unknown;
    const oldBody = "PanGit grouped old-line review comment";
    const newBody = "PanGit grouped new-line review comment";

    const capture = await recorder.capture(() =>
      repository.pullRequests.reviews(pullRequest).create({
        body: "PanGit grouped Gitea review",
        commitSha: input.fixtures.sourceSha,
      }).gitea((context) => {
        callbackCount++;
        extensionContext = context;
        return {
          event: "pending",
          comments: [
            { body: oldBody, path: input.fixtures.changedPath, oldPosition: 1 },
            { body: newBody, path: input.fixtures.changedPath, newPosition: 1 },
          ],
        };
      }).execute()
    );
    const proof = proveRequestSequence(
      "createPullRequestReview.giteaExtension",
      ["repoCreatePullReview"],
      capture,
    );
    requestEvidence.push(proof.evidence);
    assert(callbackCount === 1, "Review extension callback did not run exactly once");
    assert(
      JSON.stringify(extensionContext) === JSON.stringify({
        repositoryFullName: repository.fullName,
        pullRequestNumber: pullRequest.number,
        sourceSha: input.fixtures.sourceSha,
      }),
      "Review extension received an incorrect context",
    );
    assert(
      JSON.stringify(submittedBody) === JSON.stringify({
        event: "PENDING",
        body: "PanGit grouped Gitea review",
        commit_id: input.fixtures.sourceSha,
        comments: [
          { body: oldBody, path: input.fixtures.changedPath, old_position: 1 },
          { body: newBody, path: input.fixtures.changedPath, new_position: 1 },
        ],
      }),
      "Review extension did not preserve exact Gitea event/position fields",
    );
    assert(proof.value.state === "pending", "Gitea pending review state was not normalized");
    assert(Object.isFrozen(proof.value), "Gitea review snapshot is mutable");
    assertions.push(
      "one create-review request carries the exact event and grouped old/new positions",
    );
  });

  return Object.freeze({
    id: "gitea-extension/pull-request-review",
    passed,
    assertions: Object.freeze(assertions),
    requestEvidence: Object.freeze(requestEvidence),
  });
}
