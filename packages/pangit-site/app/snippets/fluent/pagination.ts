import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
let cursor: string | undefined;
const maxPages = 5;
for (let pageNumber = 0; pageNumber < maxPages; pageNumber++) {
  const page = await repo.branches.list({ limit: 20, cursor });
  for (const branch of page.items) console.log(branch.name);
  cursor = page.nextCursor;
  if (!cursor) break;
}
if (cursor) console.log("More branches remain; retain the cursor to continue.");
