import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const branch = await repo.branches.create({ name: "docs-update", source: "main" });
const delta = await repo.branches.divergence("main", branch.name);
console.log(delta.ahead, delta.behind);

const tag = await repo.tags.create({
  name: "v1.0.0",
  target: branch.sha,
  message: "First release",
});
console.log(tag.name, tag.sha);
