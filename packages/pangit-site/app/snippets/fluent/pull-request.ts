import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const pullRequest = await repo.pullRequests.create({
  title: "Refresh the documentation",
  description: "Update the README and add a starting guide.",
  source: { owner: repo.owner, repository: repo.name, branch: "docs-update" },
  targetBranch: "main",
});
await repo.pullRequests.requestReviewers(pullRequest, ["reviewer"]);
console.log(pullRequest.number, pullRequest.url);
