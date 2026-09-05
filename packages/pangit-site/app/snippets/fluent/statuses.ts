import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const branch = await repo.branches.get("docs-update");
await repo.statuses.set({ kind: "commit", sha: branch.sha }, {
  context: "ci/documentation",
  state: "success",
  description: "Documentation checks passed",
  targetUrl: "https://ci.example.com/runs/123",
}).execute();

const combined = await repo.statuses.get({ kind: "branch", name: "docs-update" });
console.log(combined.state, combined.statuses);
