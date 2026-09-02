import { parse as parseYaml } from "@std/yaml";

import type { WorkspacePaths } from "../../workspace-layout.ts";
import { liveTestPlan } from "../../../tests/e2e/hand-written/read-live-test-plan.ts";
import { generatedE2EOwnershipMarker } from "./clean-generated-e2e-output.ts";
import { generateE2ETestAssets } from "./generate-e2e-test-assets.ts";
import { generatedE2ETestPaths } from "./generated-e2e-test-paths.ts";

function assert(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function write(path: URL, source: string): Promise<void> {
  await Deno.mkdir(new URL("./", path), { recursive: true });
  await Deno.writeTextFile(path, source);
}

async function writeFixture(root: URL, withFluentApiTest = true): Promise<WorkspacePaths> {
  const paths: WorkspacePaths = {
    root,
    codegen: {
      root: new URL("codegen/", root),
      pangit: new URL("codegen/pangit/", root),
      pangitSite: new URL("codegen/pangit-site/", root),
    },
    packages: {
      pangit: new URL("packages/pangit/", root),
      site: new URL("packages/pangit-site/", root),
    },
  };
  const gitHosts: Record<string, unknown> = {};

  for (const [gitHost, testPlan] of Object.entries(liveTestPlan.gitHosts)) {
    const versions: Record<string, unknown> = {};
    for (const version of Object.keys(testPlan.versions)) {
      const normalized =
        `codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/${gitHost}/${version}.json`;
      const client = `src/generated-rest-clients/${gitHost}/${version}/mod.ts`;
      versions[version] = {
        ref: `v${version}`,
        source: `https://example.invalid/${gitHost}/${version}.json`,
        format: "json",
        destination:
          `codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/${gitHost}/${version}.json`,
        bytes: 1,
        sha256: "sha256:fixture",
        artifacts: {
          normalized,
          client,
          documentation: {
            openapi: `app/documentation/generated/${gitHost}/${version}/openapi.json`,
            operations: `app/documentation/generated/${gitHost}/${version}/operations.json`,
            route: `/docs/raw/${gitHost}/${version}`,
          },
        },
      };
      await write(
        new URL(normalized, root),
        JSON.stringify({
          openapi: "3.0.0",
          paths: {
            "/things/{id}": {
              get: {
                operationId: "getThing",
                parameters: [{ name: "id", in: "path", required: true }],
                responses: { "200": { description: "ok" } },
              },
            },
          },
        }),
      );
      await write(
        new URL(client, paths.packages.pangit),
        'export * from "./FixtureRestClient.ts";\n',
      );
      await write(
        new URL(
          `src/generated-rest-clients/${gitHost}/${version}/FixtureRestClient.ts`,
          paths.packages.pangit,
        ),
        `export const fixtureOperations = { getThing: { id: "getThing", method: "GET", path: "/things/{id}" } } as const;\nexport class FixtureRestClient {}\n`,
      );
    }
    gitHosts[gitHost] = {
      name: testPlan.displayName,
      kind: "release",
      upstream: "https://example.invalid",
      selected: Object.keys(testPlan.versions).at(-1),
      client: {
        className: "FixtureRestClient",
        displayName: `${testPlan.displayName} fixture client`,
        namespaceName: "FixtureApi",
        variablePrefix: "fixture",
      },
      versions,
    };

    await write(
      new URL(testPlan.rawRestClientTestCases, root),
      JSON.stringify({
        schemaVersion: 1,
        variables: {},
        parameterDefaults: { id: "1" },
        scenarios: [{
          name: "fixture",
          steps: [{ operationId: "getThing", expect: { status: [200] } }],
        }],
        negativeCases: [],
      }),
    );
    await write(
      new URL(testPlan.dockerEnvironmentDefinition, root),
      JSON.stringify({
        schemaVersion: 1,
        service: {
          name: "api",
          apiUrl: "http://api:3000/v1",
          localApiUrl: "http://127.0.0.1:3000/v1",
          environment: {},
          tmpfs: [],
          bootstrapFile: "bootstrap.sh",
          healthcheck: "true",
          uid: "1000",
          gid: "1000",
        },
        runner: {
          name: "e2e",
          image: "denoland/deno:alpine",
          workspace: "/workspace",
          results: "/results",
          credentials: "/credentials",
          timeoutMs: 1_000,
        },
        credentials: {
          username: "fixture",
          password: "fixture-password",
          email: "fixture@example.invalid",
          tokenFile: "token",
          authorizationHeader: "authorization",
          tokenPrefix: "token ",
        },
        assets: ["bootstrap.sh"],
      }),
    );
    await write(
      new URL("bootstrap.sh", new URL(testPlan.dockerEnvironmentDefinition, root)),
      "#!/bin/sh\nset -eu\n",
    );
    if (withFluentApiTest && testPlan.handWrittenFluentApiTest !== undefined) {
      await write(
        new URL(testPlan.handWrittenFluentApiTest, root),
        "// Hand-written fluent API E2E.\n",
      );
    }
  }

  await write(
    new URL(
      "raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json",
      paths.codegen.pangit,
    ),
    JSON.stringify({ schemaVersion: 1, gitHosts }),
  );
  return paths;
}

Deno.test("generated raw test and Docker environment reference the hand-written fluent API test", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".provider-e2e-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  try {
    const paths = await writeFixture(root);
    await generateE2ETestAssets(paths);
    const [gitHost, testPlan] = Object.entries(liveTestPlan.gitHosts)[0];
    const version = Object.keys(testPlan.versions)[0];
    const artifacts = generatedE2ETestPaths(gitHost, version);

    const raw = new URL(`${artifacts.generatedRawRestClientTest}/`, root);
    const docker = new URL(`${artifacts.generatedDockerEnvironment}/`, root);
    assert(
      await Deno.readTextFile(new URL(".generated", raw)) === generatedE2EOwnershipMarker,
      "Generated raw REST-client test is not marker-owned",
    );
    assert(
      await Deno.readTextFile(new URL(".generated", docker)) === generatedE2EOwnershipMarker,
      "Generated Docker environment is not marker-owned",
    );
    const test = await Deno.readTextFile(
      new URL("generated-raw-rest-client-e2e_test.ts", raw),
    );
    assert(test.includes("FixtureRestClient"), "Generated raw entrypoint omitted the client");
    assert(
      test.includes("run-generated-raw-rest-client-test.ts"),
      "Generated raw entrypoint does not reuse the runner",
    );
    assert(!test.includes("fluent-api"), "Generated raw test contains fluent API behavior");
    assert(
      await Deno.readTextFile(new URL(testPlan.handWrittenFluentApiTest!, root)) ===
        "// Hand-written fluent API E2E.\n",
      "Generation changed the hand-written fluent API test",
    );
    const run = JSON.parse(
      await Deno.readTextFile(new URL("generated-test-run.json", docker)),
    );
    assert(
      run.suites.generatedRawRestClientTest.testFile ===
        `${artifacts.generatedRawRestClientTest}/generated-raw-rest-client-e2e_test.ts`,
      "Generated run manifest does not name the generated raw test",
    );
    assert(
      run.suites.handWrittenFluentApiTest.testFile === testPlan.handWrittenFluentApiTest,
      "Generated run manifest does not name the hand-written fluent API test",
    );
    const compose = parseYaml(await Deno.readTextFile(new URL("compose.yaml", docker))) as {
      services: Record<string, { working_dir?: string; volumes?: string[]; command?: string[] }>;
    };
    assert(compose.services.e2e.working_dir === "/workspace", "Runner is not workspace-rooted");
    assert(
      compose.services.e2e.command?.at(-1) === "tests/e2e/runner/run-tests-inside-docker.ts",
      "Compose does not use the explicit E2E runner",
    );
    assert(
      compose.services.e2e.volumes?.some((volume) => volume.endsWith(":/results")) === true,
      "Compose does not bind the separate results tree",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test("generator refuses to invent a missing hand-written fluent API test", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".provider-e2e-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  try {
    const paths = await writeFixture(root, false);
    let rejected = false;
    try {
      await generateE2ETestAssets(paths);
    } catch (error) {
      rejected = error instanceof Deno.errors.NotFound;
    }
    assert(rejected, "Generator accepted a missing hand-written fluent API test");
    for (const testPlan of Object.values(liveTestPlan.gitHosts)) {
      if (testPlan.handWrittenFluentApiTest !== undefined) {
        let exists = true;
        try {
          await Deno.stat(new URL(testPlan.handWrittenFluentApiTest, root));
        } catch (error) {
          if (error instanceof Deno.errors.NotFound) exists = false;
          else throw error;
        }
        assert(!exists, "Generator invented a hand-written fluent API test");
      }
    }
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
