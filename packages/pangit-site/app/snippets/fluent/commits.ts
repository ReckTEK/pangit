import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const recent = await repo.commits.list({ ref: "main", limit: 10 });
const latest = recent.items[0];
if (latest) {
  const detail = await repo.commits.get(latest.sha, { files: true, stats: true });
  console.log(detail.message, detail.files);
}

const comparison = await repo.commits.compare("main", "docs-update").execute();
console.log(comparison.commits.map((commit) => commit.sha));
