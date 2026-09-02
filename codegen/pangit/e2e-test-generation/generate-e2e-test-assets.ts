import { workspace, type WorkspacePaths } from "../../workspace-layout.ts";
import { generatedRestClientArtifact } from "../raw-rest-client-generation/generated-rest-client-paths.ts";
import type { GeneratedOpenApiManifest } from "../raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";
import { liveTestPlan } from "../../../tests/e2e/hand-written/read-live-test-plan.ts";
import { generatedE2ETestPaths } from "./generated-e2e-test-paths.ts";
import {
  rawRestClientTestRuntime,
  readDockerTestEnvironmentDefinition,
  writeGeneratedDockerTestEnvironment,
} from "./docker-test-environments/write-generated-docker-environment.ts";
import { writeGeneratedRawRestClientTestSuite } from "./raw-rest-client-tests/write-generated-test-suite.ts";

/** Generate only raw REST-client tests and Docker environments; hand-written tests are referenced. */
export async function generateE2ETestAssets(
  paths: WorkspacePaths = workspace,
): Promise<void> {
  const openApiManifest = JSON.parse(
    await Deno.readTextFile(
      new URL(
        "raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json",
        paths.codegen.pangit,
      ),
    ),
  ) as GeneratedOpenApiManifest;

  for (const [gitHost, testPlan] of Object.entries(liveTestPlan.gitHosts)) {
    const hostManifest = openApiManifest.gitHosts[gitHost];
    if (hostManifest === undefined) {
      throw new Error(`${gitHost}: live test plan has no generated OpenAPI client`);
    }
    const environment = await readDockerTestEnvironmentDefinition(
      paths,
      testPlan.dockerEnvironmentDefinition,
    );
    for (const [version, testRelease] of Object.entries(testPlan.versions)) {
      const openApiRelease = hostManifest.versions[version];
      if (openApiRelease === undefined) {
        throw new Error(`${gitHost} ${version}: live test plan has no generated REST client`);
      }
      const expectedClient = generatedRestClientArtifact(gitHost, version);
      if (openApiRelease.artifacts.client !== expectedClient) {
        throw new Error(
          `${gitHost} ${version}: client artifact must be ${expectedClient}, got ${openApiRelease.artifacts.client}`,
        );
      }
      const output = generatedE2ETestPaths(gitHost, version);
      await writeGeneratedRawRestClientTestSuite({
        paths,
        gitHost,
        version,
        hostManifest,
        openApiRelease,
        testPlan,
        containerImage: testRelease.containerImage,
        outputPath: output.generatedRawRestClientTest,
        environment: rawRestClientTestRuntime(environment),
      });
      await writeGeneratedDockerTestEnvironment({
        paths,
        gitHost,
        version,
        hostManifest,
        testPlan,
        containerImage: testRelease.containerImage,
        environment,
        output,
      });
    }
  }
}
