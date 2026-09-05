import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
if (repo.issues.support.supported) {
  const issue = await repo.issues.create({
    title: "Document the release process",
    description: "Include the checklist and asset upload steps.",
  });
  await repo.issues.comments.create(issue, { body: "I will take this." });
  const updated = await repo.issues.update(issue, { title: "Write the release guide" }).execute();
  console.log(updated.number, updated.title);
}
