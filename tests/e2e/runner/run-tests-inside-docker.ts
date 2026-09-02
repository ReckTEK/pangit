import type { GeneratedLiveTestRun } from "./generated-live-test-run.ts";
import {
  type E2ESuite,
  e2eSuites,
  includesFluentSuite,
  includesRawSuite,
} from "./e2e-run-selection.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const runPath = Deno.env.get("PANGIT_E2E_TEST_RUN");
assert(runPath !== undefined, "PANGIT_E2E_TEST_RUN is required");
const run = JSON.parse(await Deno.readTextFile(runPath)) as GeneratedLiveTestRun;
const suiteValue = Deno.env.get("PANGIT_E2E_SUITE") ?? "all";
assert(
  (e2eSuites as readonly string[]).includes(suiteValue),
  `Invalid PANGIT_E2E_SUITE: ${suiteValue}`,
);
const suite = suiteValue as E2ESuite;
const contract = Deno.env.get("PANGIT_E2E_CONTRACT") || undefined;
assert(contract === undefined || suite === "fluent", "A contract requires the fluent-only suite");
assert(
  !includesFluentSuite(suite) || run.suites.handWrittenFluentApiTest !== undefined,
  `${run.gitHost} ${run.version} has no hand-written fluent suite`,
);

const results = run.runner.results;
const generatedRawResults = `${results}/generated-raw-rest-client-test`;
const handWrittenFluentResults = `${results}/hand-written-fluent-api-test`;
const coverageData = `${generatedRawResults}/coverage-data`;
const coverageTarget =
  `${run.runner.workspace}/${run.suites.generatedRawRestClientTest.clientImplementation}`;
const allowedNetworkHosts = [
  new URL(run.service.apiUrl).host,
  ...(run.runner.networkHosts ?? []),
];

if (includesRawSuite(suite)) await Deno.mkdir(generatedRawResults, { recursive: true });
if (includesFluentSuite(suite)) await Deno.mkdir(handWrittenFluentResults, { recursive: true });

async function command(args: string[]): Promise<Deno.CommandOutput> {
  const result = await new Deno.Command(Deno.execPath(), {
    args,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const output = new TextDecoder().decode(result.stdout) +
    new TextDecoder().decode(result.stderr);
  if (args[0] !== "test") console.log(output);
  return result;
}

const testArguments = [
  "--config=tests/e2e/runner/deno.json",
  "--no-lock",
  `--allow-net=${allowedNetworkHosts.join(",")}`,
  `--allow-read=${run.runner.workspace},${run.runner.credentials}`,
  `--allow-write=${results}`,
  "--allow-env=PANGIT_E2E_TEST_RUN,PANGIT_E2E_CONTRACT",
  "--clean",
];

const generatedRawTest = includesRawSuite(suite)
  ? await command([
    "test",
    ...testArguments,
    `--coverage=${coverageData}`,
    "--coverage-raw-data-only",
    `--junit-path=${generatedRawResults}/junit.xml`,
    run.suites.generatedRawRestClientTest.testFile,
  ])
  : undefined;
if (generatedRawTest !== undefined) {
  await Deno.writeFile(
    `${generatedRawResults}/test.log`,
    new Uint8Array([...generatedRawTest.stdout, ...generatedRawTest.stderr]),
  );
  console.log(
    `Generated raw REST-client test exited ${generatedRawTest.code}; output: ${generatedRawResults}/test.log`,
  );
}

const fluentTestFile = run.suites.handWrittenFluentApiTest?.testFile;
const handWrittenFluentTest = includesFluentSuite(suite)
  ? await command([
    "test",
    ...testArguments,
    `--junit-path=${handWrittenFluentResults}/junit.xml`,
    fluentTestFile!,
  ])
  : undefined;
if (handWrittenFluentTest !== undefined) {
  await Deno.writeFile(
    `${handWrittenFluentResults}/test.log`,
    new Uint8Array([...handWrittenFluentTest.stdout, ...handWrittenFluentTest.stderr]),
  );
  console.log(
    `Hand-written fluent API test exited ${handWrittenFluentTest.code}; output: ${handWrittenFluentResults}/test.log`,
  );
}

const testsPassed = (generatedRawTest?.success ?? true) &&
  (handWrittenFluentTest?.success ?? true);
let reportingPassed = true;
let endpointTotals: unknown;
let sourceCoverage: unknown;

if (generatedRawTest !== undefined) {
  for (
    const args of [
      [
        "coverage",
        `--include=${coverageTarget}`,
        "--lcov",
        `--output=${generatedRawResults}/coverage.lcov`,
        coverageData,
      ],
      ["coverage", `--include=${coverageTarget}`, "--html", coverageData],
    ]
  ) {
    const result = await command(args);
    reportingPassed &&= result.success;
  }

  if (reportingPassed) {
    await Deno.rename(`${coverageData}/html`, `${generatedRawResults}/coverage`);
    const lcov = (await Deno.readTextFile(`${generatedRawResults}/coverage.lcov`)).replace(
      /^SF:.*$/gm,
      `SF:${run.suites.generatedRawRestClientTest.clientImplementation}`,
    );
    await Deno.writeTextFile(`${generatedRawResults}/coverage.lcov`, lcov);
    const metric = (found: string, hit: string) => {
      const total = Number(lcov.match(new RegExp(`^${found}:(\\d+)$`, "m"))?.[1]);
      const covered = Number(lcov.match(new RegExp(`^${hit}:(\\d+)$`, "m"))?.[1]);
      return {
        total,
        covered,
        percent: total === 0 ? 100 : Number((100 * covered / total).toFixed(2)),
      };
    };
    const endpoint = JSON.parse(
      await Deno.readTextFile(`${generatedRawResults}/endpoint-coverage.json`),
    );
    endpointTotals = endpoint.totals;
    sourceCoverage = {
      lines: metric("LF", "LH"),
      branches: metric("BRF", "BRH"),
      functions: metric("FNF", "FNH"),
    };

    for await (const entry of Deno.readDir(`${generatedRawResults}/coverage`)) {
      if (!entry.name.endsWith(".html")) continue;
      const path = `${generatedRawResults}/coverage/${entry.name}`;
      await Deno.writeTextFile(
        path,
        (await Deno.readTextFile(path)).replace(
          /^(\s*)at (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), .*$/m,
          "$1from the real E2E run",
        ),
      );
    }
  }
  await Deno.remove(coverageData, { recursive: true }).catch(() => {});
}

let handWrittenFluentApiContracts: unknown;
if (handWrittenFluentTest !== undefined) {
  try {
    handWrittenFluentApiContracts = JSON.parse(
      await Deno.readTextFile(`${handWrittenFluentResults}/fluent-api-contracts.json`),
    );
  } catch (error) {
    console.error(
      `Cannot read hand-written fluent API evidence: ${
        error instanceof Error ? error.message : error
      }`,
    );
    reportingPassed = false;
  }
}

if (reportingPassed) {
  const suites = {
    ...(generatedRawTest === undefined ? {} : {
      generatedRawRestClientTest: {
        kind: "generated-raw-rest-client-test",
        passed: generatedRawTest.success,
        junit: "generated-raw-rest-client-test/junit.xml",
        log: "generated-raw-rest-client-test/test.log",
      },
    }),
    ...(handWrittenFluentTest === undefined ? {} : {
      handWrittenFluentApiTest: {
        kind: "hand-written-fluent-api-test",
        passed: handWrittenFluentTest.success,
        junit: "hand-written-fluent-api-test/junit.xml",
        log: "hand-written-fluent-api-test/test.log",
        evidence: "hand-written-fluent-api-test/fluent-api-contracts.json",
      },
    }),
  };
  await Deno.writeTextFile(
    `${results}/summary.json`,
    `${
      JSON.stringify(
        {
          gitHost: run.gitHost,
          version: run.version,
          containerImage: run.containerImage,
          kind: "real-http-e2e",
          selection: { suite, ...(contract === undefined ? {} : { contract }) },
          passed: testsPassed,
          suites,
          ...(endpointTotals === undefined ? {} : { endpoints: endpointTotals }),
          ...(sourceCoverage === undefined ? {} : { sourceCoverage }),
          ...(handWrittenFluentApiContracts === undefined ? {} : { handWrittenFluentApiContracts }),
        },
        null,
        2,
      )
    }\n`,
  );
}

Deno.exit(testsPassed && reportingPassed ? 0 : 1);
