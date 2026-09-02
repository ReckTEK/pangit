import type { ProviderVersion } from "../../../../../packages/pangit/src/fluent-api/mod.ts";
import type { GeneratedLiveTestRun } from "../../../runner/generated-live-test-run.ts";
import {
  type RepositoryContainerContractFixtures,
  runRepositoryContainerContract,
} from "../../fluent-api-contracts/repository-container-api-contract.ts";
import fixturesValue from "./gitea-repository-fixtures.json" with { type: "json" };
import { runGiteaNativeContextContract } from "./gitea-native-rest-client-access-contract.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const runPath = Deno.env.get("PANGIT_E2E_TEST_RUN");
assert(runPath !== undefined, "PANGIT_E2E_TEST_RUN is required");
const run = JSON.parse(await Deno.readTextFile(runPath)) as GeneratedLiveTestRun;
assert(run.gitHost === "gitea", `Gitea test received ${run.gitHost}`);
const version = run.version as ProviderVersion<"gitea">;
const fixtures = fixturesValue as RepositoryContainerContractFixtures;

Deno.test(`gitea ${version} hand-written fluent API E2E`, async (t) => {
  const token = (await Deno.readTextFile(
    `${run.runner.credentials}/${run.credentials.tokenFile}`,
  )).trim();
  assert(token.length > 0, "Sandbox did not issue an API token");

  const contracts = [
    await runRepositoryContainerContract(t, {
      provider: "gitea",
      version,
      apiUrl: run.service.apiUrl,
      token,
      fixtures,
    }),
    await runGiteaNativeContextContract(t, {
      version,
      apiUrl: run.service.apiUrl,
      token,
      fixtures,
    }),
  ];
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
