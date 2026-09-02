import { markGenerated } from "../../../generated-notices.ts";
import { relativePath, type WorkspacePaths } from "../../../workspace-layout.ts";
import type { GeneratedOpenApiManifest } from "../../raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";
import type { LiveTestPlanEntry } from "../../../../tests/e2e/hand-written/read-live-test-plan.ts";
import type {
  JsonRecord,
  RawRestClientTestCases,
} from "../../../../tests/e2e/hand-written/raw-rest-client-test-cases/raw-rest-client-test-case-types.ts";
import type { GeneratedRawRestClientTestManifest } from "../../../../tests/e2e/runner/generated-raw-rest-client-test-manifest.ts";
import { generatedE2EOwnershipMarker } from "../clean-generated-e2e-output.ts";
import { readGeneratedClientOperations } from "./read-generated-client-operations.ts";
import { validateHandWrittenTestCases } from "./validate-hand-written-test-cases.ts";

type HostManifest = GeneratedOpenApiManifest["gitHosts"][string];
type OpenApiRelease = HostManifest["versions"][string];

function moduleSpecifier(from: URL, module: URL): string {
  const path = relativePath(from, module);
  return path.startsWith(".") ? path : `./${path}`;
}

/** Write one disposable test entrypoint and manifest for a generated raw REST client. */
export async function writeGeneratedRawRestClientTestSuite(input: {
  paths: WorkspacePaths;
  gitHost: string;
  version: string;
  hostManifest: HostManifest;
  openApiRelease: OpenApiRelease;
  testPlan: LiveTestPlanEntry;
  containerImage: string;
  outputPath: string;
  environment: Pick<
    GeneratedRawRestClientTestManifest,
    "service" | "runner" | "credentials"
  >;
}): Promise<void> {
  const {
    paths,
    gitHost,
    version,
    hostManifest,
    openApiRelease,
    testPlan,
    containerImage,
    outputPath,
    environment,
  } = input;
  const cases = JSON.parse(
    await Deno.readTextFile(new URL(testPlan.rawRestClientTestCases, paths.root)),
  ) as RawRestClientTestCases;
  const document = JSON.parse(
    await Deno.readTextFile(new URL(openApiRelease.artifacts.normalized, paths.root)),
  ) as JsonRecord;
  const clientModule = new URL(openApiRelease.artifacts.client, paths.packages.pangit);
  const clientImplementation = new URL(`${hostManifest.client.className}.ts`, clientModule);
  await Deno.stat(clientImplementation);
  const { operations, openAPIOperations } = await readGeneratedClientOperations(
    gitHost,
    version,
    document,
    clientModule,
    hostManifest.client.variablePrefix,
  );
  const prepared = validateHandWrittenTestCases(
    gitHost,
    version,
    cases,
    operations,
    openAPIOperations,
  );
  const output = new URL(`${outputPath}/`, paths.root);
  await Deno.mkdir(output, { recursive: true });
  const generated: GeneratedRawRestClientTestManifest = {
    ...cases,
    ...environment,
    gitHost,
    version,
    containerImage,
    clientModule: relativePath(paths.root, clientModule),
    clientImplementation: relativePath(paths.root, clientImplementation),
    resultsDirectory: `${environment.runner.results}/generated-raw-rest-client-test`,
    operations,
    ...prepared,
  };
  await Deno.writeTextFile(new URL(".generated", output), generatedE2EOwnershipMarker);
  await Deno.writeTextFile(
    new URL("generated-test-manifest.json", output),
    `${JSON.stringify(generated, null, 2)}\n`,
  );

  const runtime = new URL("tests/e2e/runner/run-generated-raw-rest-client-test.ts", paths.root);
  const test = `import { ${hostManifest.client.className} } from ${
    JSON.stringify(moduleSpecifier(output, clientModule))
  };\nimport manifest from "./generated-test-manifest.json" with { type: "json" };\nimport { runGeneratedRawRestClientTest } from ${
    JSON.stringify(moduleSpecifier(output, runtime))
  };\nDeno.test(${
    JSON.stringify(`${gitHost} ${version} generated raw REST-client E2E`)
  }, async (t) => { await runGeneratedRawRestClientTest(t, manifest, ${hostManifest.client.className}); });\n`;
  await Deno.writeTextFile(
    new URL("generated-raw-rest-client-e2e_test.ts", output),
    markGenerated(test, "//"),
  );
}
