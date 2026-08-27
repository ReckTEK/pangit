import { bold, cyan, dim, green, red, setColorEnabled } from "@std/fmt/colors";

const root = new URL("../", import.meta.url);
const phases = [
  {
    title: "Clean generated artifacts",
    detail: "Remove src/generated; leave docs/test-results untouched",
    script: null,
    permissions: [],
  },
  {
    title: "Download specifications",
    detail: "Refresh live schemas and configured release versions",
    script: "codegen/specs/fetch.ts",
    permissions: ["--allow-net", "--allow-write=codegen/specs/raw"],
  },
  {
    title: "Normalize specifications",
    detail: "Rebuild the versioned OpenAPI schema tree",
    script: "codegen/specs/normalizers/mod.ts",
    permissions: [
      "--allow-read=codegen/specs/raw",
      "--allow-write=codegen/specs/normalized",
      "--allow-env=NODE_DISABLE_COLORS",
    ],
  },
  {
    title: "Generate REST clients",
    detail: "Build and type-check versioned clients and the lazy loader",
    script: "codegen/generator/generate.ts",
    permissions: [
      "--allow-read=codegen/specs/normalized,codegen/specs/raw/manifest.json,src,codegen/generator/public-names.json",
      "--allow-write=src",
      "--allow-run=deno",
    ],
  },
  {
    title: "Generate E2E suites and sandboxes",
    detail: "Build tests, Compose, bootstrap, and container-support files; do not run them",
    script: "codegen/tests/generate.ts",
    permissions: [
      "--allow-read=codegen/specs/normalized,codegen/specs/raw/manifest.json,codegen/tests,src",
      "--allow-write=src/generated",
    ],
  },
  {
    title: "Update README test results",
    detail: "Render saved docs/test-results summaries; do not execute tests",
    script: "codegen/readme.ts",
    permissions: ["--allow-read=README.md,docs/test-results", "--allow-write=README.md"],
  },
] as const;

async function generate(): Promise<void> {
  setColorEnabled(Deno.stdout.isTerminal() && !Deno.noColor);
  console.log(
    `\n${bold(cyan("Generate"))} ${dim("specifications → clients → E2E assets → README")}\n`,
  );
  const decoder = new TextDecoder();
  const started = performance.now();

  for (const [index, phase] of phases.entries()) {
    const title = `${index + 1}/${phases.length} ${phase.title}`;
    console.log(`${cyan("▶")} ${bold(title)}\n  ${dim(phase.detail)}`);
    const phaseStarted = performance.now();
    try {
      if (phase.script === null) {
        try {
          await Deno.remove(new URL("src/generated/", root), { recursive: true });
        } catch (error) {
          if (!(error instanceof Deno.errors.NotFound)) throw error;
        }
      } else {
        const result = await new Deno.Command(Deno.execPath(), {
          args: ["run", ...phase.permissions, phase.script],
          cwd: root,
          stdout: "piped",
          stderr: "piped",
        }).output();
        const stderr = decoder.decode(result.stderr).trimEnd();
        if (!result.success) {
          const stdout = decoder.decode(result.stdout).trimEnd();
          if (stdout) console.error(stdout);
          if (stderr) console.error(stderr);
          throw new Error(`Exited with code ${result.code}`);
        }
        if (stderr) console.error(stderr);
      }
      console.log(
        `${green("✓")} ${title} ${
          dim(`(${((performance.now() - phaseStarted) / 1000).toFixed(1)}s)`)
        }\n`,
      );
    } catch (error) {
      console.error(`${red("✗")} ${title}: ${error instanceof Error ? error.message : error}`);
      Deno.exit(1);
    }
  }

  console.log(
    `${bold(green("Generation complete"))} ${
      dim(`(${((performance.now() - started) / 1000).toFixed(1)}s)`)
    }`,
  );
  console.log(`No containers or E2E tests were run. Execute them with ${bold("deno task e2e")}.\n`);
}

if (import.meta.main) await generate();
