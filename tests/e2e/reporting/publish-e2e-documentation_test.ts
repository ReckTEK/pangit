import { generatedE2ETestPaths } from "../../../codegen/pangit/e2e-test-generation/generated-e2e-test-paths.ts";
import type { WorkspacePaths } from "../../../codegen/workspace-layout.ts";
import { liveTestResultOwnershipMarker } from "../result-management/prepare-result-directories.ts";
import type { LiveTestRelease } from "../runner/discover-generated-live-tests.ts";
import { renderEndpointTableMarkdown } from "./e2e-markdown-report.ts";
import {
  e2eDocumentationOwnershipMarker,
  publishE2EDocumentation,
} from "./publish-e2e-documentation.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

const html =
  `<html><head><title>runtime title</title><style>runtime CSS</style></head><body><h1>runtime heading</h1><p>runtime timestamp</p><div class="cards">old counters</div><p><a href="coverage/index.html">HTML navigation</a></p><table><thead><tr><th>Result</th><th>Endpoint</th><th>Real responses and assertions</th></tr></thead><tbody><tr><td>PASS</td><td>GET /items<small>getItems</small></td><td>200: first<br>200: second</td></tr><tr><td>NEGATIVE</td><td>GET /absent<small>getAbsent</small></td><td>404: expected<pre>error | detail\nsecond line</pre></td></tr></tbody></table></body></html>`;

async function writeJson(path: URL, value: unknown): Promise<void> {
  await Deno.mkdir(new URL("./", path), { recursive: true });
  await Deno.writeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function fixture(
  execute: (paths: WorkspacePaths, results: URL, release: LiveTestRelease) => Promise<void>,
  withHandWrittenFluentApi = false,
): Promise<void> {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".e2e-report-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  const pangit = new URL("packages/pangit/", root);
  const paths: WorkspacePaths = {
    root,
    codegen: {
      root: new URL("codegen/", root),
      pangit: new URL("codegen/pangit/", root),
      pangitSite: new URL("codegen/pangit-site/", root),
    },
    packages: { pangit, site: new URL("packages/pangit-site/", root) },
  };
  const artifacts = generatedE2ETestPaths("fixture", "1.0.0");
  const raw = new URL(`${artifacts.results}/`, root);
  const totals = {
    operations: 2,
    passed: 2,
    positive: 1,
    negativeOnly: 1,
    missing: 0,
    failedCases: 0,
    cases: 3,
  };
  const identity = {
    gitHost: "fixture",
    version: "1.0.0",
    containerImage: "fixture:1.0.0",
    kind: "real-http-e2e",
  };
  try {
    const generatedRawRestClientTest = new URL(
      `${artifacts.generatedRawRestClientTest}/`,
      root,
    );
    const generatedDockerEnvironment = new URL(
      `${artifacts.generatedDockerEnvironment}/`,
      root,
    );
    const release: LiveTestRelease = {
      gitHost: "fixture",
      displayName: "Fixture",
      version: "1.0.0",
      generatedRawRestClientTest,
      generatedDockerEnvironment,
      results: raw,
      compose: new URL(artifacts.compose, root),
      auth: new URL(".auth/", generatedDockerEnvironment),
      run: {
        schemaVersion: 1,
        gitHost: "fixture",
        version: "1.0.0",
        containerImage: "fixture:1.0.0",
        service: {
          name: "fixture",
          apiUrl: "http://fixture:3000/api/v1",
          localApiUrl: "http://localhost:3000/api/v1",
          environment: {},
          tmpfs: [],
          bootstrapFile: "bootstrap.sh",
          healthcheck: "true",
          uid: "1000",
          gid: "1000",
        },
        runner: {
          name: "e2e",
          image: "denoland/deno:latest",
          workspace: "/workspace",
          results: "/results",
          credentials: "/credentials",
          timeoutMs: 1000,
        },
        credentials: {
          username: "fixture",
          password: "fixture",
          email: "fixture@example.com",
          tokenFile: "token",
          authorizationHeader: "Authorization",
          tokenPrefix: "token ",
        },
        suites: {
          generatedRawRestClientTest: {
            testFile:
              `${artifacts.generatedRawRestClientTest}/generated-raw-rest-client-e2e_test.ts`,
            manifestFile: `${artifacts.generatedRawRestClientTest}/generated-test-manifest.json`,
            clientImplementation:
              "packages/pangit/src/generated-rest-clients/fixture/1.0.0/FixtureRestClient.ts",
          },
          ...(withHandWrittenFluentApi
            ? {
              handWrittenFluentApiTest: {
                testFile:
                  "tests/e2e/hand-written/git-host-adapter-tests/fixture/fixture-fluent-api-e2e_test.ts",
              },
            }
            : {}),
        },
      },
    };
    await Deno.mkdir(raw, { recursive: true });
    await Deno.writeTextFile(new URL(".generated", raw), liveTestResultOwnershipMarker);
    const handWrittenFluentApiContracts = {
      schemaVersion: 1,
      gitHost: "fixture",
      version: "1.0.0",
      kind: "hand-written-fluent-api-contracts",
      passed: true,
      contracts: [{
        name: "repository-container",
        passed: true,
        assertions: ["Git-host adapter reached the live fixture"],
      }],
    };
    await writeJson(new URL("summary.json", raw), {
      ...identity,
      passed: true,
      suites: {
        generatedRawRestClientTest: {
          kind: "generated-raw-rest-client-test",
          passed: true,
          junit: "generated-raw-rest-client-test/junit.xml",
          log: "generated-raw-rest-client-test/test.log",
        },
        ...(withHandWrittenFluentApi
          ? {
            handWrittenFluentApiTest: {
              kind: "hand-written-fluent-api-test",
              passed: true,
              junit: "hand-written-fluent-api-test/junit.xml",
              log: "hand-written-fluent-api-test/test.log",
              evidence: "hand-written-fluent-api-test/fluent-api-contracts.json",
            },
          }
          : {}),
      },
      endpoints: totals,
      sourceCoverage: {
        lines: { total: 100, covered: 95, percent: 95 },
        branches: { total: 2, covered: 2, percent: 100 },
        functions: { total: 5, covered: 4, percent: 80 },
      },
      ...(withHandWrittenFluentApi ? { handWrittenFluentApiContracts } : {}),
    });
    const rawResults = new URL("generated-raw-rest-client-test/", raw);
    await Deno.mkdir(rawResults, { recursive: true });
    await Deno.writeTextFile(new URL("junit.xml", rawResults), "<testsuites />\n");
    await Deno.writeTextFile(new URL("test.log", rawResults), "raw REST client passed\n");
    await Deno.writeTextFile(new URL("coverage.lcov", rawResults), "TN:\nend_of_record\n");
    await Deno.mkdir(new URL("coverage/", rawResults));
    await Deno.writeTextFile(
      new URL("coverage/index.html", rawResults),
      "<html><body>coverage</body></html>\n",
    );
    if (withHandWrittenFluentApi) {
      const fluentApiResults = new URL("hand-written-fluent-api-test/", raw);
      await Deno.mkdir(fluentApiResults, { recursive: true });
      await Deno.writeTextFile(new URL("junit.xml", fluentApiResults), "<testsuites />\n");
      await Deno.writeTextFile(new URL("test.log", fluentApiResults), "fluent API passed\n");
      await writeJson(
        new URL("fluent-api-contracts.json", fluentApiResults),
        handWrittenFluentApiContracts,
      );
    }
    await writeJson(new URL("endpoint-coverage.json", rawResults), {
      gitHost: identity.gitHost,
      version: identity.version,
      containerImage: identity.containerImage,
      kind: "generated-raw-rest-client-test",
      totals,
      endpoints: [
        { id: "getItems", passed: true, positive: true },
        { id: "getAbsent", passed: true, positive: false },
      ],
    });
    await Deno.writeTextFile(new URL("index.html", rawResults), html);
    await Deno.writeTextFile(
      new URL("README.md", root),
      "# Fixture\n\n[1.0.0](packages/pangit/docs/test-results/fixture/1.0.0/test-result.md)\n",
    );
    await execute(paths, raw, release);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
}

Deno.test("raw HTML conversion retains every endpoint in stable Markdown rows", () => {
  const markdown = renderEndpointTableMarkdown(html);
  assert(
    markdown.split("\n").filter((line) => line.startsWith("|")).length === 4,
    "Multiline cases broke table rows",
  );
  assert(markdown.includes("GET /items — getItems"), "Endpoint ID was merged into path");
  assert(markdown.includes("200: first; 200: second"), "Repeated cases were lost");
  assert(markdown.includes("error \\| detail second line"), "Error text was not escaped");
  assert(!/runtime|old counters|\.html|<table|<style/.test(markdown), "Runtime noise leaked");
});

Deno.test("E2E documentation publication is deterministic and removes orphan output", async () => {
  await fixture(async (paths, raw, release) => {
    const readmePath = new URL("README.md", paths.root);
    const originalReadme = await Deno.readTextFile(readmePath);
    await publishE2EDocumentation(paths, [release]);
    const output = new URL("docs/test-results/", paths.packages.pangit);
    const report = new URL("fixture/1.0.0/test-result.md", output);
    const first = await Deno.readTextFile(report);
    assert(first.includes("Generated by `deno task e2e`"), "E2E provenance is missing");
    assert(
      first.includes("## Generated raw REST client E2E"),
      "Generated raw REST-client result is missing",
    );
    assert(
      first.includes("## Hand-written fluent API E2E"),
      "Hand-written fluent API result is missing",
    );
    assert(
      first.includes("Git-host adapter reached the live fixture"),
      "Hand-written fluent API assertions are missing",
    );
    assert(first.includes("2 / 2"), "Endpoint totals are missing");
    assert(first.includes("95.00%") && first.includes("80.00%"), "Coverage is missing");
    assert(first.includes("- `getAbsent`"), "Negative-only operation is hidden");
    assert(!first.includes("runtime timestamp"), "Runtime noise entered Markdown");
    assert(
      await Deno.readTextFile(new URL(".generated", output)) ===
        e2eDocumentationOwnershipMarker,
      "Report-tree ownership marker is missing",
    );

    const orphan = new URL("obsolete/0.0.0/test-result.md", output);
    await Deno.mkdir(new URL("./", orphan), { recursive: true });
    await Deno.writeTextFile(orphan, "orphan");
    await publishE2EDocumentation(paths, [release]);
    assert(await Deno.readTextFile(report) === first, "Repeated publication changed Markdown");
    let orphanExists = true;
    try {
      await Deno.lstat(orphan);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) orphanExists = false;
      else throw error;
    }
    assert(!orphanExists, "Obsolete report survived complete-tree replacement");
    assert(await Deno.readTextFile(readmePath) === originalReadme, "Publisher rewrote README");
    assert(
      await Deno.readTextFile(new URL("generated-raw-rest-client-test/index.html", raw)) === html,
      "Raw evidence changed",
    );
  }, true);
});

Deno.test("invalid evidence or unowned documentation cannot replace published reports", async () => {
  await fixture(async (paths, raw, release) => {
    await publishE2EDocumentation(paths, [release]);
    const report = new URL(
      "docs/test-results/fixture/1.0.0/test-result.md",
      paths.packages.pangit,
    );
    const first = await Deno.readTextFile(report);
    await Deno.writeTextFile(
      new URL("generated-raw-rest-client-test/index.html", raw),
      "<table><tr><td>incomplete</td></tr></table>",
    );
    let rejected = false;
    try {
      await publishE2EDocumentation(paths, [release]);
    } catch {
      rejected = true;
    }
    assert(rejected, "Invalid evidence was accepted");
    assert(await Deno.readTextFile(report) === first, "Invalid evidence changed published output");
  });

  await fixture(async (paths, _raw, release) => {
    const human = new URL("docs/test-results/human.md", paths.packages.pangit);
    await Deno.mkdir(new URL("./", human), { recursive: true });
    await Deno.writeTextFile(human, "human content");
    let rejected = false;
    try {
      await publishE2EDocumentation(paths, [release]);
    } catch (error) {
      rejected = error instanceof Error && error.message.includes("unowned E2E documentation");
    }
    assert(rejected, "Unowned documentation was accepted");
    assert(await Deno.readTextFile(human) === "human content", "Unowned documentation changed");
  });
});

Deno.test("declared hand-written fluent API E2E requires independent evidence", async () => {
  await fixture(async (paths, raw, release) => {
    const summaryPath = new URL("summary.json", raw);
    const summary = JSON.parse(await Deno.readTextFile(summaryPath));
    delete summary.handWrittenFluentApiContracts;
    await writeJson(summaryPath, summary);

    let rejected = false;
    try {
      await publishE2EDocumentation(paths, [release]);
    } catch (error) {
      rejected = error instanceof Error &&
        error.message.includes("Invalid live-test report summary");
    }
    assert(rejected, "Missing hand-written fluent API evidence was accepted");
  }, true);

  await fixture(async (paths, raw, release) => {
    await Deno.remove(new URL("hand-written-fluent-api-test/junit.xml", raw));
    let rejected = false;
    try {
      await publishE2EDocumentation(paths, [release]);
    } catch (error) {
      rejected = error instanceof Error &&
        error.message.includes("Invalid live-test suite evidence");
    }
    assert(rejected, "Missing hand-written fluent API JUnit evidence was accepted");
  }, true);
});

Deno.test("raw REST-client publication requires its generated coverage evidence", async () => {
  await fixture(async (paths, raw, release) => {
    await Deno.remove(new URL("generated-raw-rest-client-test/coverage.lcov", raw));
    let rejected = false;
    try {
      await publishE2EDocumentation(paths, [release]);
    } catch (error) {
      rejected = error instanceof Error &&
        error.message.includes("Invalid live-test suite evidence");
    }
    assert(rejected, "Missing raw REST-client LCOV evidence was accepted");
  });

  await fixture(async (paths, raw, release) => {
    await Deno.remove(new URL("generated-raw-rest-client-test/coverage/index.html", raw));
    let rejected = false;
    try {
      await publishE2EDocumentation(paths, [release]);
    } catch (error) {
      rejected = error instanceof Error &&
        error.message.includes("Invalid live-test suite evidence");
    }
    assert(rejected, "Missing raw REST-client HTML coverage evidence was accepted");
  });
});
