import { workspace } from "../workspace-layout.ts";
import {
  createPanGitGenerationPhases,
  type PanGitGenerationDependencies,
} from "./pangit-generator.ts";

Deno.test("PanGit generation runs only library-owned work in dependency order", async () => {
  const calls: string[] = [];
  const record = (name: string) => () => {
    calls.push(name);
    return Promise.resolve();
  };
  const dependencies: PanGitGenerationDependencies = {
    paths: workspace,
    fetchApiSpecs: record("fetch"),
    reuseApiSpecs: record("reuse"),
    normalizeApiSpecs: record("normalize"),
    cleanGeneratedTestArtifacts: record("clean-tests"),
    generateRestClients: record("generate-clients"),
    generateClientTests: record("generate-e2e-assets"),
  };

  const phases = createPanGitGenerationPhases(
    { cached: true, updatePublicNames: false },
    dependencies,
  );
  for (const phase of phases) await phase.run();

  assertSequence(calls, [
    "reuse",
    "normalize",
    "generate-clients",
    "clean-tests",
    "generate-e2e-assets",
  ]);
});

function assertSequence(actual: readonly string[], expected: readonly string[]): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
