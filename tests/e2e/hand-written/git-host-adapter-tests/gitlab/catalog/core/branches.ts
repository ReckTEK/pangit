import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreBranches = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const main = await f.prove("Branch lookup is direct", [
    "getApiV4ProjectsIdRepositoryBranchesBranch",
  ], () => repo.branches.get("main"));
  const branch = await repo.branches.create({ name: "feature/encoded", source: main.sha });
  f.equal(branch.sha, main.sha, "Branch created at exact commit");
  await f.commit(repo.id, branch.name, "feature.txt", "feature\n");
  await f.commit(repo.id, "main", "main.txt", "main\n");
  const d = await repo.branches.divergence("main", branch.name);
  f.equal([d.ahead, d.behind], [1, 1], "Divergence compares both directions");
  await f.prove(
    "Unsafe branch rename rejects before HTTP",
    [],
    () =>
      f.rejects(
        () => repo.branches.rename(branch, "feature/renamed"),
        "CapabilityUnavailableError",
      ),
  );
  f.assert(
    await repo.branches.exists(branch.name),
    "Unsupported rename preserves original branch",
  );
  f.assert(!await repo.branches.exists("feature/renamed"), "Unsupported rename creates no ref");
  await repo.branches.delete(branch);
  f.assert(!await repo.branches.exists(branch.name), "Delete removes branch");
};
