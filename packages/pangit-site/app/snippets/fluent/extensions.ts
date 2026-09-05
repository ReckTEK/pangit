import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const result = await repo.commits.compare("main", "docs-update")
  .gitea(() => ({ output: "diff" }))
  .execute();
console.log(result.content); // Gitea 1.27.2: the raw diff as text.
