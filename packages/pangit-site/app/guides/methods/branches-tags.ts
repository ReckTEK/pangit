import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const branches = {
  title: "repo.branches",
  source: "fluent-api/capabilities/RepositoryBranches.ts",
  methods: {
    "list":
      "list({ limit?, cursor?, query?, signal? }) \u2192 Page<Branch>. Query matches branch names.",
    "get":
      "get(name, options?) \u2192 Branch. Fetch the branch name, head SHA, and protected flag when known.",
    "exists":
      "exists(name, options?) \u2192 boolean. Not found becomes false; unrelated failures still throw.",
    "create":
      "create({ name, source }, options?) \u2192 Branch. Source is an existing branch or commit reference.",
    "rename":
      "rename(branch, name, options?) \u2192 void. Rename a fetched branch; fetch the new name afterward. Unavailable on GitLab.",
    "delete": "delete(branch, options?) \u2192 void. Delete a fetched branch.",
    "divergence":
      "divergence(base, head, options?) \u2192 { ahead, behind, complete: true }. Count commits unique to head and base respectively.",
    "listDivergences":
      "listDivergences({ base, limit?, cursor?, query?, maxItems?, concurrency?, signal? }) \u2192 Page<BranchDivergenceResult>. Compare a bounded page of branches against base.",
  } satisfies MethodDescriptions<api.RepositoryBranches<"gitea", "1.27.2">>,
};

export const tags = {
  title: "repo.tags",
  source: "fluent-api/capabilities/RepositoryTags.ts",
  methods: {
    "list": "list(request?) \u2192 Page<Tag>. Fetch one page of tags.",
    "get":
      "get(name, options?) \u2192 Tag. Fetch name, SHA, and message or annotated status when the provider establishes them.",
    "create":
      "create({ name, target, message }, options?) \u2192 Tag. Create a tag at the selected reference.",
    "delete": "delete(tag, options?) \u2192 void. Delete a fetched tag.",
  } satisfies MethodDescriptions<api.RepositoryTags<"gitea", "1.27.2">>,
};
