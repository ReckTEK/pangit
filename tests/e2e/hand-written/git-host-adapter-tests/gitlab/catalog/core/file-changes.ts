import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreFileChanges = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const first = await repo.content.commitChanges({
    branch: "main",
    message: "atomic create",
    changes: [{ operation: "create", path: "one.txt", content: "one" }, {
      operation: "create",
      path: "two.txt",
      content: "two",
    }],
  }).execute();
  const one = await repo.content.read("one.txt");
  await repo.content.commitChanges({
    branch: "main",
    newBranch: "changes",
    message: "atomic edit",
    changes: [
      { operation: "update", path: "one.txt", content: "changed", sha: one.sha },
      { operation: "move", fromPath: "two.txt", path: "moved.txt" },
      { operation: "upsert", path: "upsert.txt", content: "new" },
    ],
  }).execute();
  f.equal(
    await repo.content.readText("one.txt", { ref: "main" }),
    "one",
    "New-branch commit preserves source",
  );
  f.equal(
    await repo.content.readText("one.txt", { ref: "changes" }),
    "changed",
    "Update guards file SHA",
  );
  f.equal(
    await repo.content.readText("moved.txt", { ref: "changes" }),
    "two",
    "Move retains content",
  );
  await f.rejects(
    () =>
      repo.content.commitChanges({
        branch: "changes",
        message: "stale",
        changes: [{ operation: "update", path: "one.txt", sha: one.sha, content: "bad" }],
      }).execute(),
    "ConflictError",
  );
  f.equal(
    (await repo.commits.get(first.sha)).message.trim(),
    "atomic create",
    "Atomic changes form one commit",
  );
  await repo.content.commitChanges({
    branch: "changes",
    message: "delete",
    changes: [{ operation: "delete", path: "moved.txt" }],
  }).execute();
  f.equal(
    (await repo.content.readFiles(["moved.txt"], { ref: "changes" }))[0].unavailable,
    "missing",
    "Delete removes content",
  );
};
