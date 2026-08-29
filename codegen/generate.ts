import { bold, cyan, dim, green, red, setColorEnabled } from "@std/fmt/colors";
import { generateDocumentation } from "./docs/generate.ts";
import { generateRestClients } from "./generator/generate.ts";
import { generateReadme } from "./readme.ts";
import { generateReports } from "./reports/generate.ts";
import { cleanGeneratedArtifacts } from "./results.ts";
import { generateSiteAssets } from "./site/assets.ts";
import { generateRouteTypes } from "./site/routes.ts";
import { fetchApiSpecs, reuseApiSpecs } from "./specs/fetch.ts";
import { normalizeApiSpecs } from "./specs/normalizers/mod.ts";
import { generateClientTests } from "./tests/generate.ts";
import { relativePath, workspace } from "./workspace.ts";

interface GenerationOptions {
  cached: boolean;
  updatePublicNames: boolean;
}

/** The only generation entry point, including artifacts consumed by another package. */
async function generate(options: GenerationOptions): Promise<void> {
  const library = workspace.packages.pangit;
  const phases = [
    {
      title: options.cached ? "Validate checked-in specifications" : "Download specifications",
      run: () => options.cached ? reuseApiSpecs() : fetchApiSpecs(),
    },
    { title: "Normalize specifications", run: normalizeApiSpecs },
    {
      title: "Clean generated artifacts; preserve saved E2E evidence",
      run: () => cleanGeneratedArtifacts(new URL("src/generated/", library)),
    },
    {
      title: "Generate and type-check REST clients",
      run: () => generateRestClients({ updatePublicNames: options.updatePublicNames }),
    },
    {
      title: "Generate API documentation",
      run: () => generateDocumentation(),
    },
    { title: "Generate E2E suites and sandboxes", run: () => generateClientTests() },
    { title: "Publish saved E2E results as Markdown", run: () => generateReports(library) },
    {
      title: "Update root README test results",
      run: () =>
        generateReadme(library, {
          readmePath: new URL("README.md", workspace.root),
          reportPrefix: `${relativePath(workspace.root, library)}/`,
        }),
    },
    { title: "Generate site reference and static assets", run: () => generateSiteAssets() },
    { title: "Generate site route types", run: () => generateRouteTypes() },
  ];

  setColorEnabled(Deno.stdout.isTerminal() && !Deno.noColor);
  console.log(`\n${bold(cyan("Generate PanGit"))}\n`);
  const started = performance.now();
  for (const [index, phase] of phases.entries()) {
    const title = `${index + 1}/${phases.length} ${phase.title}`;
    console.log(`${cyan("▶")} ${bold(title)}`);
    const phaseStarted = performance.now();
    try {
      await phase.run();
      console.log(
        `${green("✓")} ${title} ${
          dim(`(${((performance.now() - phaseStarted) / 1000).toFixed(1)}s)\n`)
        }`,
      );
    } catch (error) {
      throw new Error(`${title}: ${error instanceof Error ? error.message : error}`, {
        cause: error,
      });
    }
  }
  console.log(
    `${bold(green("Generation complete"))} ${
      dim(`(${((performance.now() - started) / 1000).toFixed(1)}s)`)
    }`,
  );
  console.log(`No containers or E2E tests were run. Execute them with ${bold("deno task e2e")}.\n`);
}

if (import.meta.main) {
  try {
    const unknown = Deno.args.filter((argument) =>
      argument !== "--cached" && argument !== "--update-public-names"
    );
    if (unknown.length) throw new Error(`Unknown generation arguments: ${unknown.join(", ")}`);
    await generate({
      cached: Deno.args.includes("--cached"),
      updatePublicNames: Deno.args.includes("--update-public-names"),
    });
  } catch (error) {
    console.error(`${red("✗")} ${error instanceof Error ? error.message : error}`);
    Deno.exit(1);
  }
}
