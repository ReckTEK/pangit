import type { GeneratedLiveTestRun } from "./generated-live-test-run.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const runPath = Deno.env.get("PANGIT_E2E_TEST_RUN");
assert(runPath !== undefined, "PANGIT_E2E_TEST_RUN is required");
const run = JSON.parse(await Deno.readTextFile(runPath)) as GeneratedLiveTestRun;
const results = run.runner.results;
const generatedRawResults = `${results}/generated-raw-rest-client-test`;
const handWrittenFluentResults = `${results}/hand-written-fluent-api-test`;
const coverageData = `${generatedRawResults}/coverage-data`;
const coverageTarget =
  `${run.runner.workspace}/${run.suites.generatedRawRestClientTest.clientImplementation}`;

await Deno.mkdir(generatedRawResults, { recursive: true });
if (run.suites.handWrittenFluentApiTest !== undefined) {
  await Deno.mkdir(handWrittenFluentResults, { recursive: true });
}

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
  `--allow-net=${new URL(run.service.apiUrl).host}`,
  `--allow-read=${run.runner.workspace},${run.runner.credentials}`,
  `--allow-write=${results}`,
  "--allow-env=PANGIT_E2E_TEST_RUN",
  "--clean",
];
const generatedRawTest = await command([
  "test",
  ...testArguments,
  `--coverage=${coverageData}`,
  "--coverage-raw-data-only",
  `--junit-path=${generatedRawResults}/junit.xml`,
  run.suites.generatedRawRestClientTest.testFile,
]);
await Deno.writeFile(
  `${generatedRawResults}/test.log`,
  new Uint8Array([...generatedRawTest.stdout, ...generatedRawTest.stderr]),
);
console.log(
  `Generated raw REST-client test exited ${generatedRawTest.code}; output: ${generatedRawResults}/test.log`,
);

const handWrittenFluentTest = run.suites.handWrittenFluentApiTest === undefined
  ? undefined
  : await command([
    "test",
    ...testArguments,
    `--junit-path=${handWrittenFluentResults}/junit.xml`,
    run.suites.handWrittenFluentApiTest.testFile,
  ]);
if (handWrittenFluentTest !== undefined) {
  await Deno.writeFile(
    `${handWrittenFluentResults}/test.log`,
    new Uint8Array([...handWrittenFluentTest.stdout, ...handWrittenFluentTest.stderr]),
  );
  console.log(
    `Hand-written fluent API test exited ${handWrittenFluentTest.code}; output: ${handWrittenFluentResults}/test.log`,
  );
}

const testsPassed = generatedRawTest.success && (handWrittenFluentTest?.success ?? true);
let reportingPassed = true;
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
      generatedRawRestClientTest: {
        kind: "generated-raw-rest-client-test",
        passed: generatedRawTest.success,
        junit: "generated-raw-rest-client-test/junit.xml",
        log: "generated-raw-rest-client-test/test.log",
      },
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
            passed: testsPassed,
            suites,
            endpoints: endpoint.totals,
            sourceCoverage: {
              lines: metric("LF", "LH"),
              branches: metric("BRF", "BRH"),
              functions: metric("FNF", "FNH"),
            },
            ...(handWrittenFluentApiContracts === undefined
              ? {}
              : { handWrittenFluentApiContracts }),
          },
          null,
          2,
        )
      }\n`,
    );
  }
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
Deno.exit(testsPassed && reportingPassed ? 0 : 1);
