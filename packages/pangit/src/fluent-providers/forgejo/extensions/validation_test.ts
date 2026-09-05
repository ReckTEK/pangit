import type { ForgejoCreatePullRequestReviewExtension } from "./pull-request-reviews.ts";
import { forgejoExtensions } from "./runtime.ts";
import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  PullRequestReviewAdapter,
  PullRequestReviewData,
} from "../../../fluent-api/adapter-contract/optional/pull-request-reviews.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { PullRequest } from "../../../fluent-api/entities/PullRequest.ts";
import { createPullRequestReviews } from "../../../fluent-api/capabilities/optional/PullRequestReviews.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function assertValidation(
  execute: () => Promise<unknown>,
  operation: string,
): Promise<void> {
  try {
    await execute();
  } catch (error) {
    assert(error instanceof ValidationError, `Expected ValidationError, received ${String(error)}`);
    assert(error.provider === "forgejo", "validation error omitted provider");
    assert(error.version === "16.0.3", "validation error omitted version");
    assert(error.operation === operation, "validation error used the wrong operation");
    return;
  }
  throw new Error("Expected ValidationError");
}

const repository = Object.freeze({
  id: "1",
  owner: "owner",
  name: "repository",
  fullName: "owner/repository",
  defaultBranch: "main",
  private: false,
  archived: false,
  native: null as never,
}) satisfies RepositoryData<"forgejo", "16.0.3">;

const pullRequest = Object.freeze({
  id: "2",
  number: 2,
  title: "Review me",
  state: "open",
  source: Object.freeze({
    owner: "owner",
    repository: "repository",
    branch: "feature",
    sha: "head",
  }),
  target: Object.freeze({
    owner: "owner",
    repository: "repository",
    branch: "main",
    sha: "base",
  }),
  merged: false,
  native: null as never,
}) satisfies PullRequest<"forgejo", "16.0.3">;

const review = Object.freeze({
  id: "3",
  state: "pending",
  native: null as never,
}) satisfies PullRequestReviewData<"forgejo", "16.0.3">;

Deno.test("review create extension validates every Forgejo input before the adapter", async () => {
  let adapterCalls = 0;
  const adapter = {
    pullRequestReviewSupport: Object.freeze({
      supported: true,
      operations: Object.freeze({
        list: "one-page",
        get: "direct",
        create: "direct",
        submit: "direct",
      }),
      dismissal: "provider-extension-or-native",
      replies: "provider-extension-or-native",
      resolution: "provider-extension-or-native",
      richPositions: "provider-extension-or-native",
    }),
    createPullRequestReview() {
      adapterCalls++;
      return Promise.resolve(review);
    },
  } as unknown as PullRequestReviewAdapter<"forgejo", "16.0.3">;
  const reviews = createPullRequestReviews(
    "forgejo",
    "16.0.3",
    { ...adapter, extensions: forgejoExtensions },
    repository,
    pullRequest,
  );
  const invalidExtensions: readonly unknown[] = [
    { event: "not-an-event" },
    { comments: [] },
    { comments: [{ body: " ", path: "file.ts", newPosition: 1 }] },
    { comments: [{ body: "comment", path: " ", newPosition: 1 }] },
    { comments: [{ body: "comment", path: "file.ts", oldPosition: 0 }] },
    { comments: [{ body: "comment", path: "file.ts", newPosition: 1.5 }] },
    { comments: [{ body: "comment", path: "file.ts" }] },
  ];

  for (const extension of invalidExtensions) {
    const executable = reviews.create().forgejo(() =>
      extension as ForgejoCreatePullRequestReviewExtension
    );
    await assertValidation(() => executable.execute(), "createPullRequestReview");
  }
  assert(adapterCalls === 0, "invalid review extension reached the provider adapter");
});
