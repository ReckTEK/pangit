import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCorePullRequestMerge = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  await repo.branches.create({ name: "feature", source: "main" });
  await f.commit(repo.id, "feature", "merge.txt", "merge\n");
  const pr = await repo.pullRequests.create({
    title: "Merge me",
    source: { owner: "root", repository: repo.name, branch: "feature" },
    targetBranch: "main",
  });
  const merged = await repo.pullRequests.merge(pr, { method: "squash", deleteSourceBranch: true })
    .execute();
  f.assert(
    merged.merged && merged.mergeCommitSha,
    "Merge waits for actual completion and commit identity",
  );
  f.assert(
    await repo.pullRequests.isMerged(pr, { refresh: true }),
    "Refresh observes completed merge",
  );
  f.equal(
    await repo.content.readText("merge.txt"),
    "merge\n",
    "Merged content reaches target branch",
  );
};
