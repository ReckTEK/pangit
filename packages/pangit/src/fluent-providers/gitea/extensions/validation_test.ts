import type { GiteaProviderTypes } from "../provider-types.ts";
import type { GiteaCreatePullRequestReviewExtension } from "./pull-request-reviews.ts";
import { giteaExtensions } from "./runtime.ts";
import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  IssueAdapter,
  IssueData,
} from "../../../fluent-api/adapter-contract/optional/issues.ts";
import type {
  PullRequestReviewAdapter,
  PullRequestReviewData,
} from "../../../fluent-api/adapter-contract/optional/pull-request-reviews.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { Issue } from "../../../fluent-api/entities/optional/Issue.ts";
import type { PullRequest } from "../../../fluent-api/entities/PullRequest.ts";
import { createPullRequestReviews } from "../../../fluent-api/capabilities/optional/PullRequestReviews.ts";
import { createRepositoryIssues } from "../../../fluent-api/capabilities/optional/RepositoryIssues.ts";

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
}) satisfies RepositoryData<"gitea", "1.27.2", GiteaProviderTypes>;

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
}) satisfies PullRequest<"gitea", "1.27.2", GiteaProviderTypes>;

const review = Object.freeze({
  id: "3",
  state: "pending",
  native: null as never,
}) satisfies PullRequestReviewData<"gitea", "1.27.2", GiteaProviderTypes>;

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
  } as unknown as PullRequestReviewAdapter<"gitea", "1.27.2", GiteaProviderTypes>;
  const reviews = createPullRequestReviews(
    "gitea",
    "1.27.2",
    { ...adapter, extensions: giteaExtensions },
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
}) satisfies Issue<"gitea", "1.27.2", GiteaProviderTypes>;

Deno.test("issue update extension validates Gitea content version before the adapter", async () => {
  let adapterCalls = 0;
  const receivedVersions: (number | bigint | undefined)[] = [];
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
      contentVersionGuard: "provider-extension",
      timeTracking: "native-only",
      dependencies: "native-only",
      reactions: "native-only",
      attachments: "native-only",
      watchers: "native-only",
    }),
    updateIssue(
      _repository: RepositoryData<"gitea", "1.27.2", GiteaProviderTypes>,
      value: IssueData<"gitea", "1.27.2", GiteaProviderTypes>,
      _input: unknown,
      options: { extension?: { contentVersion: number | bigint } },
    ) {
      adapterCalls++;
      receivedVersions.push(options.extension?.contentVersion);
      return Promise.resolve(value);
    },
  } as unknown as IssueAdapter<"gitea", "1.27.2", GiteaProviderTypes>;
  const issues = createRepositoryIssues("gitea", "1.27.2", {
    ...adapter,
    extensions: giteaExtensions,
  }, repository);

  for (const contentVersion of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, -1n]) {
    const executable = issues.update(issue, { description: "updated" }).gitea(() => ({
      contentVersion,
    }));
    await assertValidation(() => executable.execute(), "updateIssue");
  }
  assert(adapterCalls === 0, "invalid content version reached the provider adapter");
  const validVersions = [0, 0n, 17, 9007199254740993n];
  for (const contentVersion of validVersions) {
    await issues.update(issue, { description: "updated" }).gitea(() => ({ contentVersion }))
      .execute();
  }
  assert(
    receivedVersions.length === validVersions.length &&
      receivedVersions.every((value, index) => value === validVersions[index]),
    "Valid number and bigint content versions must reach the provider unchanged",
  );
});
