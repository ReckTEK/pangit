import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityBranchProtectionEnforcement = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  f.equal(
    repo.branchRules.support.effectiveProtection.supported,
    false,
    "GL-001 is reported as unavailable",
  );
  await f.prove("GL-001 rejects before requesting unreliable provider state", [], async () => {
    try {
      await repo.branchRules.effective("main");
    } catch (error) {
      f.assert(error instanceof Error, "Provider defect produces a typed error");
      f.equal((error as Error).name, "CapabilityUnavailableError", "Provider defect error type");
      f.assert(
        (error as Error).message.includes("GL-001"),
        "Provider defect identifies its upstream follow-up",
      );
      return;
    }
    throw new Error("GL-001 must not expose an unreliable permission result");
  });
};
