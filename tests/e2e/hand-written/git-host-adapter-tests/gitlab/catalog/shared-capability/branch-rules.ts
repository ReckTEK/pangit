import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityBranchRules = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  // GitLab initializes default-branch protection asynchronously. Use a dedicated branch
  // so that the test does not race the provider's unrelated project initialization.
  await repo.branches.create({ name: "rule-target", source: "main" });
  const rule = await repo.branchRules.create({
    name: "rule-target",
    pushAllowed: false,
    forcePushAllowed: false,
  });
  f.equal(rule.pushAllowed, false, "Configured rule disallows direct pushes");
  f.equal(
    (await f.prove("Configured rule lookup is direct", [
      "getApiV4ProjectsIdProtectedBranchesName",
    ], () => repo.branchRules.get("rule-target"))).pushAllowed,
    false,
    "Configured rule persisted with denied direct pushes",
  );
  f.equal(
    (await repo.branchRules.list({ maxRules: 10 })).filter((r) => r.name === "rule-target")
      .length,
    1,
    "Configured rule listing includes the exact rule once",
  );
  const updated = await repo.branchRules.update(rule, { forcePushAllowed: true });
  f.equal(updated.forcePushAllowed, true, "Protection update");
  await repo.branchRules.delete(updated);
  await f.rejects(() => repo.branchRules.get("rule-target"), "NotFoundError");
  f.equal(
    (await repo.branchRules.list({ maxRules: 10 })).filter((r) => r.name === "rule-target")
      .length,
    0,
    "Deleted configured rule is absent from the authoritative rule listing",
  );
};
