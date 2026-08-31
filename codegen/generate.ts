import { printGenerationFailure } from "./generation-runner.ts";
import {
  generatePanGit,
  type PanGitGenerationOptions,
  parsePanGitGenerationOptions,
} from "./pangit/pangit-generator.ts";
import { generatePanGitSite } from "./pangit-site/pangit-site-generator.ts";

/** Run the independent library and site generators in dependency order. */
export async function generateAll(options: PanGitGenerationOptions): Promise<void> {
  await generatePanGit(options);
  await generatePanGitSite();
}

if (import.meta.main) {
  try {
    await generateAll(parsePanGitGenerationOptions(Deno.args));
  } catch (error) {
    printGenerationFailure(error);
    Deno.exit(1);
  }
}
