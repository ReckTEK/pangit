import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCorePullRequestComments = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  await f.commit(repo.id, "main", "before.txt", "one\ntwo\nthree\nfour\nfive\n");
  await repo.branches.create({ name: "feature", source: "main" });
  await f.commit(repo.id, "feature", "review.txt", "review\n");
  await repo.content.commitChanges({
    branch: "feature",
    message: "Rename and edit review file",
    changes: [{
      operation: "move",
      fromPath: "before.txt",
      path: "after.txt",
    }],
  }).execute();
  await f.commit(repo.id, "feature", "after.txt", "one\ntwo\nchanged\nfour\nfive\n", "update");
  const pr = await repo.pullRequests.create({
    title: "Review me",
    source: { owner: "root", repository: repo.name, branch: "feature" },
    targetBranch: "main",
  });
  await repo.pullRequests.comment(pr, { body: "General comment" });
  await f.eventually(
    () => f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}`),
    (p) => !!p.diff_refs,
    "MR diff refs",
  );
  await repo.pullRequests.comment(pr, {
    body: "Inline comment",
    position: { path: "review.txt", side: "new", line: 1 },
  });
  await repo.pullRequests.comment(pr, {
    body: "Renamed file comment",
    position: { path: "after.txt", side: "new", line: 3 },
  });
  const notes = await f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}/notes`);
  f.assert(
    JSON.stringify(notes).includes("General comment") &&
      JSON.stringify(notes).includes("Inline comment") &&
      JSON.stringify(notes).includes("Renamed file comment"),
    "General, inline, and renamed-file comments persisted",
  );
  await repo.pullRequests.requestReviewers(pr, ["root"]);
  const state = await f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}`);
  f.assert(JSON.stringify(state.reviewers).includes('"root"'), "Reviewer assignment persisted");
};
