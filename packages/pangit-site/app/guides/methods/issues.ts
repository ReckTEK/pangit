import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const issues = {
  title: "repo.issues",
  source: "fluent-api/capabilities/optional/RepositoryIssues.ts",
  methods: {
    "list":
      "list(options?) \u2192 Page<Issue>. Filters: state (open/closed/all), query, labels; also accepts limit, cursor, signal.",
    "get":
      "get(number, options?) \u2192 Issue. Use a repository-local issue number, including GitLab\u2019s IID.",
    "create":
      "create(input, options?) \u2192 Issue. Supply title and optional description. Set other provider fields through native access.",
    "update":
      "update(issue, input) \u2192 operation. Execute to update title or description. Other issue fields remain provider-native.",
    "setState":
      "setState(issue, state, options?) \u2192 Issue. Set open or closed and return the updated snapshot.",
  } satisfies MethodDescriptions<api.RepositoryIssues<"gitea", "1.27.2">>,
};

export const comments = {
  title: "repo.issues.comments",
  source: "fluent-api/capabilities/optional/RepositoryIssues.ts",
  methods: {
    "list":
      "list(issue, request?) \u2192 ScanPage<IssueComment>. System notes may be filtered from a provider page; check complete and nextCursor.",
    "get": "get(id, options?) \u2192 IssueComment. Fetch a comment by its returned opaque ID.",
    "create": "create(issue, { body }, options?) \u2192 IssueComment. Add a nonempty comment.",
    "update": "update(comment, { body }, options?) \u2192 IssueComment. Return the edited comment.",
    "delete": "delete(comment, options?) \u2192 void. Delete a fetched comment.",
  } satisfies MethodDescriptions<api.RepositoryIssues<"gitea", "1.27.2">["comments"]>,
};
