import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityUnsupportedModules = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  await f.prove(
    "Unsupported draft release fails before requests",
    [],
    () =>
      f.rejects(
        () => repo.releases.create({ tagName: "draft", draft: true }),
        "CapabilityUnavailableError",
      ),
  );
  await f.prove(
    "Unsupported rule fields fail before requests",
    [],
    () =>
      f.rejects(
        () => repo.branchRules.create({ name: "main", requiredApprovals: 1 }),
        "CapabilityUnavailableError",
      ),
  );
  const client = await f.client();
  f.assert(!("gitea" in client.native), "Only selected native provider is exposed");
};
