import type { FluentClient } from "@recktek/pangit/api";
declare const git: FluentClient<"gitea", "1.27.2">;
// @example
const owner = await git.container("acme");
const existing = await owner.findRepository("website");
const repo = existing ?? await owner.createRepository("website", {
  private: true,
  defaultBranch: "main",
  initialCommitMessage: "Start the website",
  files: [{ path: "README.md", content: "# Website\n" }],
});
console.log(repo.fullName, repo.defaultBranch);
