import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const commit = await repo.content.commitChanges({
  branch: "main",
  newBranch: "docs-update",
  message: "Refresh the documentation",
  changes: [
    { operation: "update", path: "README.md", content: "# Website\n\nWelcome.\n" },
    { operation: "create", path: "docs/start.md", content: "Start here.\n" },
  ],
}).execute();
console.log(commit.sha);
