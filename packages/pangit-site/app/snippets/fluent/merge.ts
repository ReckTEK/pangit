import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const pullRequest = await repo.pullRequests.get(42);
const merged = await repo.pullRequests.merge(pullRequest, {
  method: "squash",
  deleteSourceBranch: true,
}).execute();
console.log(merged.merged, merged.mergeCommitSha);
