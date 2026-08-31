import { parse as parseYaml } from "@std/yaml";

import type { WorkspacePaths } from "../../workspace-layout.ts";
import { generateClientTests } from "./e2e-suite-generator.ts";

function assert(value: boolean, message: string): asserts value {
  if (!value) throw new Error(message);
}

/** Write a compact one-operation provider fixture for testing generated suite ownership and paths. */
async function writeFixture(root: URL): Promise<WorkspacePaths> {
  const codegenRoot = new URL("codegen/", root);
  const codegen = {
    root: codegenRoot,
    pangit: new URL("pangit/", codegenRoot),
    pangitSite: new URL("pangit-site/", codegenRoot),
  };
  const pangit = new URL("packages/pangit/", root);
  const version = "1.0.0";
  const artifacts = {
    normalized: `codegen/pangit/specs/normalized/fixture/${version}.json`,
    client: `src/providers/fixture/${version}/mod.ts`,
    tests: `tests/providers/fixture/${version}`,
    results: `tests/providers/fixture/${version}/results`,
    compose: `tests/providers/fixture/${version}/compose.yaml`,
  };
  const manifest = {
    schemaVersion: 1,
    providers: {
      fixture: {
        client: { className: "FixtureRestClient", variablePrefix: "fixture" },
        testing: { manifest: "codegen/pangit/tests/maps/fixture.json" },
        versions: {
          [version]: {
            containerImage: `fixture:${version}`,
            artifacts,
          },
        },
      },
    },
  };
  const e2e = {
    schemaVersion: 1,
    service: {
      name: "api",
      apiUrl: "http://api:3000/v1",
      localApiUrl: "http://127.0.0.1:3000/v1",
      environment: {},
      tmpfs: [],
      bootstrap: ["#!/bin/sh", "set -eu"],
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
    variables: {},
    parameterDefaults: { id: "1" },
    scenarios: [{
      name: "fixture",
      steps: [{ operationId: "getThing", expect: { status: [200] } }],
    }],
    negativeCases: [],
  };
  const normalized = {
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
  };
  const clientImplementation =
    `export const fixtureOperations = { getThing: { id: "getThing", method: "GET", path: "/things/{id}" } } as const;\nexport class FixtureRestClient {}\n`;
  const clientBarrel = 'export * from "./FixtureRestClient.ts";\n';
  const transport =
    `export class RestClient {}\nexport type RestClientOptions = Record<string, unknown>;\nexport type RestOperationInput = Record<string, unknown>;\nexport type AnyRestResponse = { status: number; body?: unknown };\n`;

  const writes = new Map<string, string>([
    ["codegen/pangit/specs/raw/manifest.json", JSON.stringify(manifest)],
    ["codegen/pangit/tests/maps/fixture.json", JSON.stringify(e2e)],
    [artifacts.normalized, JSON.stringify(normalized)],
    [`packages/pangit/${artifacts.client}`, clientBarrel],
    [
      `packages/pangit/src/providers/fixture/${version}/FixtureRestClient.ts`,
      clientImplementation,
    ],
    ["packages/pangit/src/providers/runtime/mod.ts", transport],
  ]);
  for (const [path, source] of writes) {
    const file = new URL(path, root);
    await Deno.mkdir(new URL("./", file), { recursive: true });
    await Deno.writeTextFile(file, source);
  }
  for (const template of ["deno.json.tpl", "run.ts.tpl", "runtime.ts.tpl"]) {
    const destination = new URL(`tests/templates/${template}`, codegen.pangit);
    await Deno.mkdir(new URL("./", destination), { recursive: true });
    await Deno.writeTextFile(
      destination,
      await Deno.readTextFile(new URL(`templates/${template}`, import.meta.url)),
    );
  }
  const model = new URL("tests/e2e-manifest.ts", codegen.pangit);
  await Deno.writeTextFile(
    model,
    await Deno.readTextFile(new URL("e2e-manifest.ts", import.meta.url)),
  );
  return {
    root,
    codegen,
    packages: { pangit, site: new URL("packages/pangit-site/", root) },
  };
}

Deno.test("provider suites generate outside source with stable imports and adjacent results", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".suite-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  try {
    const paths = await writeFixture(root);
    const suite = new URL("tests/providers/fixture/1.0.0/", paths.root);
    const saved = new URL("results/saved.txt", suite);
    await Deno.mkdir(new URL("./", saved), { recursive: true });
    await Deno.writeTextFile(saved, "saved evidence");
    await Deno.utime(saved, new Date("2020-01-01Z"), new Date("2020-01-01Z"));

    await generateClientTests(paths);

    assert(
      await Deno.readTextFile(new URL(".generated", suite)) ===
        "# Owned by Generator. Changes in here get nuked on code generation.\n",
      "Provider/version suite has no generator ownership marker",
    );
    assert(await Deno.readTextFile(saved) === "saved evidence", "Generation changed saved results");
    assert(
      (await Deno.stat(saved)).mtime?.toISOString() === "2020-01-01T00:00:00.000Z",
      "Generation changed saved-result metadata",
    );

    const test = await Deno.readTextFile(new URL("e2e_test.ts", suite));
    assert(
      test.includes(
        'from "../../../../packages/pangit/src/providers/fixture/1.0.0/mod.ts"',
      ),
      "E2E client import does not target the generated public provider entrypoint",
    );
    const runtime = await Deno.readTextFile(new URL("runtime.ts", suite));
    assert(
      runtime.includes('from "../../../../packages/pangit/src/providers/runtime/mod.ts"'),
      "Runtime does not resolve the package transport from its generated depth",
    );
    assert(!runtime.includes("__PANGIT_TRANSPORT_MODULE__"), "Template token leaked");
    const runtimeModule = await import(new URL("runtime.ts", suite).href);
    assert(
      typeof runtimeModule.runSuite === "function",
      "Generated runtime imports do not resolve",
    );

    const generatedManifest = JSON.parse(
      await Deno.readTextFile(new URL("manifest.json", suite)),
    );
    assert(
      generatedManifest.client ===
        "packages/pangit/src/providers/fixture/1.0.0/mod.ts",
      "Runtime manifest does not retain the generated-client package path",
    );
    assert(
      generatedManifest.clientImplementation ===
        "packages/pangit/src/providers/fixture/1.0.0/FixtureRestClient.ts",
      "Coverage does not target the generated REST-client implementation",
    );
    const suiteConfiguration = JSON.parse(
      await Deno.readTextFile(new URL("deno.json", suite)),
    );
    assert(
      suiteConfiguration.workspace?.length === 0 &&
        suiteConfiguration.nodeModulesDir === "none" &&
        suiteConfiguration.compilerOptions?.jsx === "react-jsx",
      "Generated E2E configuration is not isolated from the repository workspace",
    );
    const compose = parseYaml(await Deno.readTextFile(new URL("compose.yaml", suite))) as {
      services: Record<string, { working_dir?: string; volumes?: string[] }>;
    };
    assert(
      compose.services.e2e.working_dir === "/workspace/tests/providers/fixture/1.0.0",
      "Compose runner does not execute from the provider/version test directory",
    );
    assert(
      compose.services.e2e.volumes?.includes("../../../..:/workspace:ro") === true,
      `Compose does not mount the package root read-only: ${
        JSON.stringify(compose.services.e2e.volumes)
      }`,
    );
    assert(
      compose.services.e2e.volumes?.includes("./results:/results") === true,
      "Compose results are not an adjacent host bind mount",
    );
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});
