import { GitLabE2EFixtureDriver } from "../../../git-host-adapter-tests/gitlab/GitLabE2EFixtureDriver.ts";

const version = Deno.args[0];
if (version !== "18.11.11" && version !== "19.3.1") {
  throw new TypeError("Supply the exact GitLab version: 18.11.11 or 19.3.1");
}
const cycles = Number(Deno.args[1] ?? 20);
if (!Number.isSafeInteger(cycles) || cycles < 1 || cycles > 100) {
  throw new RangeError("Supply between 1 and 100 diagnostic cycles");
}
const token = (await Deno.readTextFile("/sandbox-auth/api-token")).trim();
for (let cycle = 0; cycle < cycles; cycle++) {
  const fixture = new GitLabE2EFixtureDriver(version, "http://gitlab", token, "");
  try {
    const repo = await fixture.project();
    const name = "rule-target";
    await repo.branches.create({ name, source: "main" });
    // Deliberately bypass the GL-001 portable-read guard to test the server itself.
    const assertEnforcement = async (expected: boolean) => {
      const branch = await fixture.raw("GET", `/projects/${repo.id}/repository/branches/${name}`);
      fixture.equal(
        branch.protected,
        expected,
        "Actual server protection matches configured state",
      );
      fixture.equal(
        branch.can_push,
        !expected,
        "Actual server push permission matches configured state",
      );
    };
    await assertEnforcement(false);
    const rule = await repo.branchRules.create({
      name,
      pushAllowed: false,
      forcePushAllowed: false,
    });
    fixture.equal(rule.pushAllowed, false, "Configured push denial");
    await assertEnforcement(true);
    const updated = await repo.branchRules.update(rule, { forcePushAllowed: true });
    fixture.equal(updated.forcePushAllowed, true, "Configured force-push update");
    await assertEnforcement(true);
    await repo.branchRules.delete(updated);
    await fixture.rejects(() => repo.branchRules.get(name), "NotFoundError");
    await assertEnforcement(false);
    console.log(
      JSON.stringify({ cycle, version, assertions: fixture.assertions.length, passed: true }),
    );
  } finally {
    await fixture.cleanup();
  }
}
