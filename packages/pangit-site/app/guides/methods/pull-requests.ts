import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const pullRequests = {
  title: "repo.pullRequests",
  source: "fluent-api/capabilities/RepositoryPullRequests.ts",
  methods: {
    "list":
      "list(options?) \u2192 Page<PullRequest>. Filter by state (open, closed, all), base, head, author, or query; accepts limit, cursor, signal. Text search may hydrate each result within the page.",
    "get":
      "get(number, options?) \u2192 PullRequest. Use the repository-local number, including GitLab\u2019s merge-request IID.",
    "find":
      "find({ base, head }, options?) \u2192 PullRequest | undefined. Find an open change matching those refs.",
    "isMerged":
      "isMerged(pullRequest, { refresh?, signal? }) \u2192 boolean. Read the snapshot unless refresh is requested.",
    "commits": "commits(pullRequest, request?) \u2192 Page<Commit>. Read one page of its commits.",
    "files":
      "files(pullRequest, request?) \u2192 Page<CommitFileData>. Read one page of changed paths and available statistics.",
    "create":
      "create({ title, description?, source, targetBranch }, options?) \u2192 PullRequest. Source contains owner, repository, branch, and optional SHA.",
    "update":
      "update(pullRequest, { title?, description?, targetBranch? }, options?) \u2192 PullRequest. Return the updated snapshot.",
    "close": "close(pullRequest, options?) \u2192 PullRequest. Close without merging.",
    "merge":
      "merge(pullRequest, { method?, deleteSourceBranch? }) \u2192 operation. Execute to merge and return a new snapshot. Methods: provider-default or squash.",
    "requestReviewers":
      "requestReviewers(pullRequest, usernames, options?) \u2192 void. Request at least one reviewer.",
    "approve":
      "approve(pullRequest, body?, options?) \u2192 void. Publish an approval as the current user.",
    "comment":
      "comment(pullRequest, { body, position? }, options?) \u2192 void. Position contains path, side (old/new), and a positive line number.",
    "reviews":
      "reviews(pullRequest) \u2192 PullRequestReviews. Access the optional persistent review lifecycle without fetching it.",
  } satisfies MethodDescriptions<api.RepositoryPullRequests<"gitea", "1.27.2">>,
};

export const reviews = {
  title: "reviews",
  source: "fluent-api/capabilities/optional/PullRequestReviews.ts",
  methods: {
    "list":
      "list(request?) \u2192 Page<PullRequestReview>. Fetch one page of persistent review objects.",
    "get": "get(id, options?) \u2192 PullRequestReview. Fetch one review.",
    "create":
      "create({ body?, commitSha? }) \u2192 operation. Execute to create a pending review; use provider extensions for richer positions.",
    "submit":
      "submit(review, { event, body? }, options?) \u2192 PullRequestReview. Submit approve, request-changes, or comment.",
  } satisfies MethodDescriptions<api.PullRequestReviews<"gitea", "1.27.2">>,
};
