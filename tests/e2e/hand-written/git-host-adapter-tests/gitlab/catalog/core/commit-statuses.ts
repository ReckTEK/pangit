import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreCommitStatuses = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const ref = { kind: "branch" as const, name: "main" };
  const pending = await repo.statuses.set(ref, { context: "pangit/check", state: "pending" })
    .execute();
  f.equal(pending.state, "pending", "Pending status round trip");
  await repo.statuses.set(ref, {
    context: "pangit/check",
    state: "success",
    description: "passed",
  }).execute();
  f.equal((await repo.statuses.get(ref)).state, "success", "Combined latest status");
  f.assert(
    (await repo.statuses.list(ref)).items.some((s) => s.context === "pangit/check"),
    "Status listing",
  );
};
