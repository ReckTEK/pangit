import { bold } from "@std/fmt/colors";

import {
  type GenerationPhase,
  printGenerationFailure,
  runGenerationPhases,
} from "../generation-runner.ts";
import { workspace, type WorkspacePaths } from "../workspace-layout.ts";
import { generateRestClients } from "./generator/rest-client-generator.ts";
import { fetchApiSpecs, reuseApiSpecs } from "./specs/fetch.ts";
import { normalizeApiSpecs } from "./specs/normalizers/mod.ts";
import { generateClientTests } from "./tests/e2e-suite-generator.ts";
import { cleanGeneratedTestArtifacts } from "./tests/generated-test-tree.ts";

/** User-selectable behavior for the PanGit library generator. */
export interface PanGitGenerationOptions {
  cached: boolean;
  updatePublicNames: boolean;
}

/** Replaceable operations used to prove the PanGit pipeline's ownership and ordering. */
export interface PanGitGenerationDependencies {
  paths: WorkspacePaths;
  fetchApiSpecs: typeof fetchApiSpecs;
  reuseApiSpecs: typeof reuseApiSpecs;
  normalizeApiSpecs: typeof normalizeApiSpecs;
  cleanGeneratedTestArtifacts: typeof cleanGeneratedTestArtifacts;
  generateRestClients: typeof generateRestClients;
  generateClientTests: typeof generateClientTests;
}

const defaultDependencies: PanGitGenerationDependencies = {
  paths: workspace,
  fetchApiSpecs,
  reuseApiSpecs,
  normalizeApiSpecs,
  cleanGeneratedTestArtifacts,
  generateRestClients,
  generateClientTests,
};

/** Build the PanGit-only phase list without including site-owned generation. */
export function createPanGitGenerationPhases(
  options: PanGitGenerationOptions,
  dependencies: PanGitGenerationDependencies = defaultDependencies,
): readonly GenerationPhase[] {
  const { paths } = dependencies;
  const providerTests = new URL("tests/providers/", paths.root);
  return [
    {
      title: options.cached ? "Validate checked-in specifications" : "Download specifications",
      run: () => options.cached ? dependencies.reuseApiSpecs() : dependencies.fetchApiSpecs(),
    },
    { title: "Normalize specifications", run: dependencies.normalizeApiSpecs },
    {
      title: "Generate and type-check REST clients",
      run: () => dependencies.generateRestClients({ updatePublicNames: options.updatePublicNames }),
    },
    {
      title: "Clean generated E2E suites; preserve saved evidence",
      run: () => dependencies.cleanGeneratedTestArtifacts(providerTests),
    },
    { title: "Generate E2E suites and sandboxes", run: () => dependencies.generateClientTests() },
  ];
}

/** Generate every PanGit library artifact without generating site-owned output. */
export async function generatePanGit(
  options: PanGitGenerationOptions,
  dependencies: PanGitGenerationDependencies = defaultDependencies,
): Promise<void> {
  await runGenerationPhases(
    "PanGit library",
    createPanGitGenerationPhases(options, dependencies),
    `No containers or E2E tests were run. Execute them with ${bold("deno task e2e")}.`,
  );
}

/** Parse the complete command-line surface shared by the root and library generators. */
export function parsePanGitGenerationOptions(args: readonly string[]): PanGitGenerationOptions {
  const allowed = new Set(["--cached", "--update-public-names"]);
  const unknown = args.filter((argument) => !allowed.has(argument));
  if (unknown.length) throw new Error(`Unknown generation arguments: ${unknown.join(", ")}`);
  return {
    cached: args.includes("--cached"),
    updatePublicNames: args.includes("--update-public-names"),
  };
}

if (import.meta.main) {
  try {
    await generatePanGit(parsePanGitGenerationOptions(Deno.args));
  } catch (error) {
    printGenerationFailure(error);
    Deno.exit(1);
  }
}
