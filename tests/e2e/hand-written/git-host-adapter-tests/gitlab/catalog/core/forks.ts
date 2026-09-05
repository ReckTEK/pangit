import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreForks = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const group = await f.group();
  const nested = await f.group("nested", group.id);
  f.assert(nested.name.includes("/"), "Nested namespace retains full path");
  const fork = await repo.forks.create({
    destination: nested,
    name: `${f.prefix}-fork`,
    timeoutMs: 60_000,
    pollIntervalMs: 500,
  });
  f.projects.push(fork.id);
  f.equal(fork.parent?.fullName, repo.fullName, "Fork parent identity retained");
  f.equal(
    (await fork.branches.get("main")).sha,
    (await repo.branches.get("main")).sha,
    "Fork is usable when create resolves",
  );
  f.assert(
    (await repo.forks.list({ limit: 10 })).items.some((p) => p.id === fork.id),
    "Fork listing contains created fork",
  );
};
