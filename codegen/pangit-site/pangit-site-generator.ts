import {
  type GenerationPhase,
  printGenerationFailure,
  runGenerationPhases,
} from "../generation-runner.ts";
import { generateDocumentation } from "./documentation/documentation-catalog-generator.ts";
import { generateRouteTypes } from "./route-types.ts";
import { generateSiteAssets } from "./static-assets.ts";

/** Replaceable operations used to prove the PanGit site pipeline's ownership and ordering. */
export interface PanGitSiteGenerationDependencies {
  generateDocumentation: typeof generateDocumentation;
  generateSiteAssets: typeof generateSiteAssets;
  generateRouteTypes: typeof generateRouteTypes;
}

const defaultDependencies: PanGitSiteGenerationDependencies = {
  generateDocumentation,
  generateSiteAssets,
  generateRouteTypes,
};

/** Build the site-only phase list without including PanGit library generation. */
export function createPanGitSiteGenerationPhases(
  dependencies: PanGitSiteGenerationDependencies = defaultDependencies,
): readonly GenerationPhase[] {
  return [
    { title: "Generate API documentation", run: () => dependencies.generateDocumentation() },
    {
      title: "Generate reference and static assets",
      run: () => dependencies.generateSiteAssets(),
    },
    { title: "Generate route types", run: () => dependencies.generateRouteTypes() },
  ];
}

/** Generate every PanGit site artifact without regenerating the library. */
export async function generatePanGitSite(
  dependencies: PanGitSiteGenerationDependencies = defaultDependencies,
): Promise<void> {
  await runGenerationPhases(
    "PanGit site",
    createPanGitSiteGenerationPhases(dependencies),
  );
}

if (import.meta.main) {
  try {
    if (Deno.args.length) {
      throw new Error(`PanGit site generation accepts no arguments: ${Deno.args.join(", ")}`);
    }
    await generatePanGitSite();
  } catch (error) {
    printGenerationFailure(error);
    Deno.exit(1);
  }
}
