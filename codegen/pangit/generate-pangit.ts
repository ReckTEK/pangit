import { bold } from "@std/fmt/colors";

import {
  type GenerationPhase,
  printGenerationFailure,
  runGenerationPhases,
} from "../generation-runner.ts";
import { workspace, type WorkspacePaths } from "../workspace-layout.ts";
import { cleanGeneratedE2EArtifacts } from "./e2e-test-generation/clean-generated-e2e-output.ts";
import { generateE2ETestAssets } from "./e2e-test-generation/generate-e2e-test-assets.ts";
import { generateRestClients } from "./raw-rest-client-generation/generate-rest-clients.ts";
import {
  downloadOpenApiSpecifications,
  reuseDownloadedOpenApiSpecifications,
} from "./raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";
import { normalizeOpenApiSpecifications } from "./raw-rest-client-generation/openapi-specifications/normalizers/normalize-all-openapi-specifications.ts";

/** User-selectable behavior for the PanGit library generator. */
export interface PanGitGenerationOptions {
  cached: boolean;
  updatePublicNames: boolean;
}

/** Replaceable operations used to prove the PanGit pipeline's ownership and ordering. */
export interface PanGitGenerationDependencies {
  paths: WorkspacePaths;
  downloadOpenApiSpecifications: typeof downloadOpenApiSpecifications;
  reuseDownloadedOpenApiSpecifications: typeof reuseDownloadedOpenApiSpecifications;
  normalizeOpenApiSpecifications: typeof normalizeOpenApiSpecifications;
  cleanGeneratedE2EArtifacts: typeof cleanGeneratedE2EArtifacts;
  generateRestClients: typeof generateRestClients;
  generateE2ETestAssets: typeof generateE2ETestAssets;
}

const defaultDependencies: PanGitGenerationDependencies = {
  paths: workspace,
  downloadOpenApiSpecifications,
  reuseDownloadedOpenApiSpecifications,
  normalizeOpenApiSpecifications,
  cleanGeneratedE2EArtifacts,
  generateRestClients,
  generateE2ETestAssets,
};

/** Build the PanGit-only phase list without including site-owned generation. */
export function createPanGitGenerationPhases(
  options: PanGitGenerationOptions,
  dependencies: PanGitGenerationDependencies = defaultDependencies,
): readonly GenerationPhase[] {
  const { paths } = dependencies;
  return [
    {
      title: options.cached ? "Validate checked-in specifications" : "Download specifications",
      run: () =>
        options.cached
          ? dependencies.reuseDownloadedOpenApiSpecifications()
          : dependencies.downloadOpenApiSpecifications(),
    },
    {
      title: "Normalize downloaded OpenAPI specifications",
      run: dependencies.normalizeOpenApiSpecifications,
    },
    {
      title: "Generate and type-check REST clients",
      run: () => dependencies.generateRestClients({ updatePublicNames: options.updatePublicNames }),
    },
    {
      title: "Clean generated E2E test assets",
      run: () => dependencies.cleanGeneratedE2EArtifacts(paths),
    },
    {
      title: "Generate raw REST-client tests and Docker environments",
      run: () => dependencies.generateE2ETestAssets(paths),
    },
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
