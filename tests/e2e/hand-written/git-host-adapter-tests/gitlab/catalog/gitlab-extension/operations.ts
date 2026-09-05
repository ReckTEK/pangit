import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runGitlabExtensionOperations = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const base = (await repo.branches.get("main")).sha;
  let configured = 0;
  const op = repo.content.commitChanges({
    branch: "main",
    newBranch: "extension",
    message: "extension commit",
    changes: [{ operation: "create", path: "extension.txt", content: "extension" }],
  });
  const commit = await op.gitlab((context) => {
    configured++;
    f.equal(context.repositoryFullName, repo.fullName, "Extension callback context");
    return { startSha: base };
  }).execute();
  f.equal(configured, 1, "Extension callback evaluated once");
  f.equal(commit.parents, [base], "Native start SHA honored");
  const ref = { kind: "commit" as const, sha: commit.sha };
  const state = await repo.statuses.set(ref, { context: "native/state", state: "pending" })
    .gitlab(() => ({ state: "running" })).execute();
  f.equal(state.providerState, "running", "Native GitLab status preserved");
  f.equal(state.state, undefined, "Native running is not invented as portable pending");
  await repo.statuses.set(ref, { context: "native/state", state: "success" }).execute();
  const pr = await repo.pullRequests.create({
    title: "Extension merge",
    source: { owner: "root", repository: repo.name, branch: "extension" },
    targetBranch: "main",
  });
  const merged = await repo.pullRequests.merge(pr, { method: "squash" }).gitlab(() => ({
    headCommitId: commit.sha,
    squashMessage: "Custom squash",
    mergeMessage: "Custom merge",
  })).execute();
  f.assert(merged.merged, "Native merge controls complete merge");

  const historical = await repo.content.commitChanges({
    branch: "main",
    message: "historical base",
    changes: [{ operation: "create", path: "historical.txt", content: "original" }],
  }).execute();
  const original = await repo.content.read("historical.txt", { ref: historical.sha });
  await repo.content.commitChanges({
    branch: "main",
    message: "advance main",
    changes: [
      { operation: "update", path: "historical.txt", content: "current" },
      { operation: "create", path: "later.txt", content: "main only" },
    ],
  }).execute();
  const forked = await repo.content.commitChanges({
    branch: "main",
    newBranch: "historical",
    message: "edit historical base",
    changes: [
      { operation: "update", path: "historical.txt", sha: original.sha, content: "forked" },
      { operation: "upsert", path: "later.txt", content: "created on historical branch" },
    ],
  }).gitlab(() => ({ startSha: historical.sha })).execute();
  f.equal(forked.parents, [historical.sha], "Historical start SHA honored");
  f.equal(
    await repo.content.readText("historical.txt", { ref: "historical" }),
    "forked",
    "SHA guard reads the selected historical base",
  );
  f.equal(
    await repo.content.readText("later.txt", { ref: "historical" }),
    "created on historical branch",
    "Upsert checks existence at the selected historical base",
  );
  f.equal(
    await repo.content.readText("historical.txt", { ref: "main" }),
    "current",
    "Historical commit preserves current main",
  );
};
