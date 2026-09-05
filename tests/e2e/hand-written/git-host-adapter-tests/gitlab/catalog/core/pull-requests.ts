import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCorePullRequests = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  await repo.branches.create({ name: "feature", source: "main" });
  await f.commit(repo.id, "feature", "change.txt", "changed\n");
  const pr = await repo.pullRequests.create({
    title: "PanGit MR",
    description: "body",
    source: { owner: "root", repository: repo.name, branch: "feature" },
    targetBranch: "main",
  });
  f.equal(pr.state, "open", "Opened merge request normalization");
  f.equal(
    (await repo.pullRequests.find({ base: "main", head: "feature" }))?.number,
    pr.number,
    "Find open merge request",
  );
  f.equal(
    (await repo.pullRequests.list({ query: "PanGit", limit: 10 })).items.length,
    1,
    "Text search finds MR",
  );
  await f.eventually(
    () => f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}`),
    (p) => !!p.diff_refs,
    "MR commit diff ready",
  );
  f.equal((await repo.pullRequests.commits(pr)).items.length, 1, "MR commit page");
  f.equal((await repo.pullRequests.files(pr)).items[0].path, "change.txt", "MR diff page");
  const updated = await repo.pullRequests.update(pr, { title: "Updated MR" });
  f.equal(updated.title, "Updated MR", "MR update returns fresh snapshot");
  f.equal((await repo.pullRequests.close(updated)).state, "closed", "MR close transition");
};
