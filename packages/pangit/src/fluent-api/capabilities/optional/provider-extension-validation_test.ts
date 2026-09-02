import { ValidationError } from "../../adapter-contract/errors.ts";
import type { IssueAdapter, IssueData } from "../../adapter-contract/optional/issues.ts";
import type {
  GiteaCreatePullRequestReviewExtension,
  PullRequestReviewAdapter,
  PullRequestReviewData,
} from "../../adapter-contract/optional/pull-request-reviews.ts";
import type { RepositoryData } from "../../adapter-contract/repositories.ts";
import type { Issue } from "../../entities/optional/Issue.ts";
import type { PullRequest } from "../../entities/PullRequest.ts";
import { createPullRequestReviews } from "./PullRequestReviews.ts";
import { createRepositoryIssues } from "./RepositoryIssues.ts";

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
    assert(error.provider === "gitea", "validation error omitted provider");
    assert(error.version === "1.27.2", "validation error omitted version");
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
}) satisfies RepositoryData<"gitea", "1.27.2">;

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
}) satisfies PullRequest<"gitea", "1.27.2">;

const review = Object.freeze({
  id: "3",
  state: "pending",
  native: null as never,
}) satisfies PullRequestReviewData<"gitea", "1.27.2">;

Deno.test("review create extension validates every Gitea input before the adapter", async () => {
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
  } as unknown as PullRequestReviewAdapter<"gitea", "1.27.2">;
  const reviews = createPullRequestReviews("gitea", "1.27.2", adapter, repository, pullRequest);
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
    const executable = reviews.create().gitea(() =>
      extension as GiteaCreatePullRequestReviewExtension
    );
    await assertValidation(() => executable.execute(), "createPullRequestReview");
  }
  assert(adapterCalls === 0, "invalid review extension reached the provider adapter");
});

const issue = Object.freeze({
  id: "4",
  number: 4,
  title: "Issue",
  state: "open",
  assignees: Object.freeze([]),
  labels: Object.freeze([]),
  native: null as never,
}) satisfies Issue<"gitea", "1.27.2">;

Deno.test("issue update extension validates Gitea content version before the adapter", async () => {
  let adapterCalls = 0;
  const adapter = {
    issueSupport: Object.freeze({
      supported: true,
      operations: Object.freeze({
        list: "one-page",
        get: "direct",
        create: "direct",
        update: "direct",
        "set-state": "direct",
        "list-comments": "one-page-derived",
        "get-comment": "direct",
        "create-comment": "direct",
        "update-comment": "direct",
        "delete-comment": "direct",
      }),
      contentVersionGuard: "gitea-extension",
      timeTracking: "native-only",
      dependencies: "native-only",
      reactions: "native-only",
      attachments: "native-only",
      watchers: "native-only",
    }),
    updateIssue(
      _repository: RepositoryData<"gitea", "1.27.2">,
      value: IssueData<"gitea", "1.27.2">,
    ) {
      adapterCalls++;
      return Promise.resolve(value);
    },
  } as unknown as IssueAdapter<"gitea", "1.27.2">;
  const issues = createRepositoryIssues("gitea", "1.27.2", adapter, repository);

  for (const contentVersion of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, -1n]) {
    const executable = issues.update(issue, { description: "updated" }).gitea(() => ({
      contentVersion,
    }));
    await assertValidation(() => executable.execute(), "updateIssue");
  }
  assert(adapterCalls === 0, "invalid content version reached the provider adapter");
});
