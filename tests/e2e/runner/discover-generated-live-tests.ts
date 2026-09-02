import { generatedE2EOwnershipMarker } from "../../../codegen/pangit/e2e-test-generation/clean-generated-e2e-output.ts";
import { generatedE2ETestPaths } from "../../../codegen/pangit/e2e-test-generation/generated-e2e-test-paths.ts";
import { workspace, type WorkspacePaths } from "../../../codegen/workspace-layout.ts";
import { liveTestPlan } from "../hand-written/read-live-test-plan.ts";
import type { GeneratedLiveTestRun } from "./generated-live-test-run.ts";

/** One generated Docker test run and its resolved repository paths. */
export interface LiveTestRelease {
  gitHost: string;
  displayName: string;
  version: string;
  generatedRawRestClientTest: URL;
  generatedDockerEnvironment: URL;
  results: URL;
  compose: URL;
  auth: URL;
  run: GeneratedLiveTestRun;
}

/** Discover only generated runs explicitly declared by the hand-written live test plan. */
export async function discoverGeneratedLiveTests(
  paths: WorkspacePaths = workspace,
): Promise<readonly LiveTestRelease[]> {
  const releases: LiveTestRelease[] = [];
  for (
    const [gitHost, testPlan] of Object.entries(liveTestPlan.gitHosts).toSorted(([left], [right]) =>
      left.localeCompare(right)
    )
  ) {
    for (
      const [version, testRelease] of Object.entries(testPlan.versions).toSorted((
        [left],
        [right],
      ) => left.localeCompare(right))
    ) {
      const expected = generatedE2ETestPaths(gitHost, version);
      const generatedRawRestClientTest = new URL(
        `${expected.generatedRawRestClientTest}/`,
        paths.root,
      );
      const generatedDockerEnvironment = new URL(
        `${expected.generatedDockerEnvironment}/`,
        paths.root,
      );
      let run: GeneratedLiveTestRun;
      try {
        if (
          await Deno.readTextFile(new URL(".generated", generatedRawRestClientTest)) !==
            generatedE2EOwnershipMarker ||
          await Deno.readTextFile(new URL(".generated", generatedDockerEnvironment)) !==
            generatedE2EOwnershipMarker
        ) {
          throw new Error("invalid generated E2E ownership marker");
        }
        run = JSON.parse(
          await Deno.readTextFile(new URL("generated-test-run.json", generatedDockerEnvironment)),
        );
        if (!(await Deno.stat(new URL("compose.yaml", generatedDockerEnvironment))).isFile) {
          throw new Error("generated Compose artifact is not a file");
        }
      } catch (error) {
        throw new Error(
          `${gitHost} ${version}: generated live test is unavailable; run deno task generate. ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
      const expectsFluentApiTest = testPlan.handWrittenFluentApiTest !== undefined;
      if (
        run.gitHost !== gitHost || run.version !== version ||
        run.containerImage !== testRelease.containerImage ||
        typeof run.runner?.name !== "string" || typeof run.runner.results !== "string" ||
        typeof run.service?.name !== "string" ||
        typeof run.suites?.generatedRawRestClientTest?.testFile !== "string" ||
        (run.suites.handWrittenFluentApiTest !== undefined) !== expectsFluentApiTest
      ) {
        throw new Error(`${gitHost} ${version}: generated live test is stale`);
      }
      releases.push({
        gitHost,
        displayName: testPlan.displayName,
        version,
        generatedRawRestClientTest,
        generatedDockerEnvironment,
        results: new URL(`${expected.results}/`, paths.root),
        compose: new URL(expected.compose, paths.root),
        auth: new URL(".auth/", generatedDockerEnvironment),
        run,
      });
    }
  }
  if (!releases.length) throw new Error("The live test plan declares no releases");
  return releases;
}
