import { bold, cyan, dim, green, red, setColorEnabled } from "@std/fmt/colors";

/** One named, independently executable step in a generation pipeline. */
export interface GenerationPhase {
  title: string;
  run(): void | Promise<void>;
}

/** Run named generation phases in order with consistent progress and failure context. */
export async function runGenerationPhases(
  generatorName: string,
  phases: readonly GenerationPhase[],
  completionNote?: string,
): Promise<void> {
  setColorEnabled(Deno.stdout.isTerminal() && !Deno.noColor);
  console.log(`\n${bold(cyan(`Generate ${generatorName}`))}\n`);
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
    `${bold(green(`${generatorName} generation complete`))} ${
      dim(`(${((performance.now() - started) / 1000).toFixed(1)}s)`)
    }`,
  );
  if (completionNote) console.log(`${completionNote}\n`);
}

/** Print a generation command failure using the same presentation as phase progress. */
export function printGenerationFailure(error: unknown): void {
  console.error(`${red("✗")} ${error instanceof Error ? error.message : error}`);
}
