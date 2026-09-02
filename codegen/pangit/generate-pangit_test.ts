import { workspace } from "../workspace-layout.ts";
import {
  createPanGitGenerationPhases,
  type PanGitGenerationDependencies,
} from "./generate-pangit.ts";

Deno.test("PanGit generation runs REST-client and E2E-asset phases in dependency order", async () => {
  const calls: string[] = [];
  const record = (name: string) => () => {
    calls.push(name);
    return Promise.resolve();
  };
  const dependencies: PanGitGenerationDependencies = {
    paths: workspace,
    downloadOpenApiSpecifications: record("download"),
    reuseDownloadedOpenApiSpecifications: record("reuse-downloaded"),
    normalizeOpenApiSpecifications: record("normalize"),
    cleanGeneratedE2EArtifacts: record("clean-generated-e2e"),
    generateRestClients: record("generate-clients"),
    generateE2ETestAssets: record("generate-e2e-assets"),
  };

  const phases = createPanGitGenerationPhases(
    { cached: true, updatePublicNames: false },
    dependencies,
  );
  for (const phase of phases) await phase.run();

  assertSequence(calls, [
    "reuse-downloaded",
    "normalize",
    "generate-clients",
    "clean-generated-e2e",
    "generate-e2e-assets",
  ]);
});

function assertSequence(actual: readonly string[], expected: readonly string[]): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
