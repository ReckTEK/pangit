import type { ProviderVersion } from "../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { GeneratedLiveTestRun } from "../../../runner/generated-live-test-run.ts";
import { GitLabE2EFixtureDriver } from "./GitLabE2EFixtureDriver.ts";
import { selectGitLabContracts } from "./gitlab-contract-catalog.ts";
import { gitlabKnownDefects } from "../../../../../packages/pangit/src/fluent-providers/gitlab/known-defects.ts";

const runPath = Deno.env.get("PANGIT_E2E_TEST_RUN");
if (!runPath) throw new Error("PANGIT_E2E_TEST_RUN is required");
const run = JSON.parse(await Deno.readTextFile(runPath)) as GeneratedLiveTestRun;
if (run.gitHost !== "gitlab") throw new Error(`GitLab suite received ${run.gitHost}`);
const selected = selectGitLabContracts(Deno.env.get("PANGIT_E2E_CONTRACT"));
Deno.test(`gitlab ${run.version} hand-written fluent API E2E`, async (t) => {
  const token = (await Deno.readTextFile(`${run.runner.credentials}/${run.credentials.tokenFile}`))
    .trim();
  const contracts = [];
  for (const contract of selected) {
    const f = new GitLabE2EFixtureDriver(
      run.version as ProviderVersion<"gitlab">,
      run.service.apiUrl,
      token,
      run.credentials.password,
    );
    const passed = await t.step(contract.id, async () => {
      try {
        await contract.run(f);
      } finally {
        await f.cleanup();
      }
    });
    contracts.push({
      id: contract.id,
      passed,
      assertions: f.assertions,
      requestEvidence: f.evidence,
    });
  }
  const passed = contracts.every((c) => c.passed);
  await Deno.writeTextFile(
    `${run.runner.results}/hand-written-fluent-api-test/fluent-api-contracts.json`,
    JSON.stringify(
      {
        schemaVersion: 1,
        gitHost: "gitlab",
        version: run.version,
        kind: "hand-written-fluent-api-contracts",
        selectedContractIds: selected.map((c) => c.id),
        passed,
        knownProviderDefects: gitlabKnownDefects,
        contracts,
      },
      null,
      2,
    ) + "\n",
  );
  if (!passed) throw new Error("One or more GitLab fluent contracts failed");
});
