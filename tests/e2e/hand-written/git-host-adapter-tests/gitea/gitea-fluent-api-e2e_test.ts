import type { ProviderVersion } from "../../../../../packages/pangit/src/fluent-api/mod.ts";
import type { GeneratedLiveTestRun } from "../../../runner/generated-live-test-run.ts";
import { GiteaE2EFixtureDriver } from "./GiteaE2EFixtureDriver.ts";
import { selectGiteaContracts } from "./gitea-contract-catalog.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const runPath = Deno.env.get("PANGIT_E2E_TEST_RUN");
assert(runPath !== undefined, "PANGIT_E2E_TEST_RUN is required");
const run = JSON.parse(await Deno.readTextFile(runPath)) as GeneratedLiveTestRun;
assert(run.gitHost === "gitea", `Gitea test received ${run.gitHost}`);
const version = run.version as ProviderVersion<"gitea">;
const selectedContracts = selectGiteaContracts(Deno.env.get("PANGIT_E2E_CONTRACT"));

Deno.test(`gitea ${version} hand-written fluent API E2E`, async (t) => {
  const token = (await Deno.readTextFile(
    `${run.runner.credentials}/${run.credentials.tokenFile}`,
  )).trim();
  assert(token.length > 0, "Sandbox did not issue an API token");

  const contracts = [];
  const webBaseUrl = new URL(run.service.apiUrl);
  webBaseUrl.pathname = "/";
  webBaseUrl.search = "";
  webBaseUrl.hash = "";
  for (const contract of selectedContracts) {
    const fixtures = await GiteaE2EFixtureDriver.create({
      version,
      apiUrl: run.service.apiUrl,
      token,
      timeoutMs: run.runner.timeoutMs,
    });
    try {
      const result = await contract.run(t, {
        version,
        apiUrl: run.service.apiUrl,
        webBaseUrl: webBaseUrl.href,
        token,
        username: run.credentials.username,
        password: run.credentials.password,
        timeoutMs: run.runner.timeoutMs,
        fixtures,
      });
      assert(result.id === contract.id, `${contract.id} emitted evidence for ${result.id}`);
      contracts.push(result);
    } finally {
      await fixtures.cleanup();
    }
  }
  const passed = contracts.every((contract) => contract.passed);
  await Deno.writeTextFile(
    `${run.runner.results}/hand-written-fluent-api-test/fluent-api-contracts.json`,
    `${
      JSON.stringify(
        {
          schemaVersion: 1,
          gitHost: run.gitHost,
          version,
          kind: "hand-written-fluent-api-contracts",
          selectedContractIds: selectedContracts.map((contract) => contract.id),
          passed,
          contracts,
        },
        null,
        2,
      )
    }\n`,
  );
  assert(passed, "One or more hand-written fluent API contracts failed");
});
