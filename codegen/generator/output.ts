/** Formatting, staged validation, and transactional publication of generated client sources. */
import { rawResultDirectories } from "../results.ts";
import { workspace } from "../workspace.ts";
import { compareText } from "./naming.ts";

export async function formatGeneratedSources(
  sources: ReadonlyMap<string, string>,
  denoConfiguration: URL,
): Promise<ReadonlyMap<string, string>> {
  const formatted = new Map<string, string>();
  for (
    const [name, source] of [...sources.entries()].toSorted(([left], [right]) =>
      compareText(left, right)
    )
  ) {
    const command = new Deno.Command(Deno.execPath(), {
      args: ["fmt", "--config", decodeURIComponent(denoConfiguration.pathname), "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = command.spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(source));
    await writer.close();
    const output = await child.output();
    if (!output.success) {
      throw new Error(
        `Failed to format generated ${name}: ${new TextDecoder().decode(output.stderr).trim()}`,
      );
    }
    formatted.set(name, new TextDecoder().decode(output.stdout));
  }
  return formatted;
}

export async function assertGeneratedSourcesCurrent(
  directory: URL,
  expected: ReadonlyMap<string, string>,
): Promise<void> {
  const failures: string[] = [];
  let actualNames: Set<string>;
  try {
    actualNames = new Set(await generatedSourceNames(directory));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Generated client directory is missing: ${directory.pathname}`);
    }
    throw error;
  }
  for (const name of actualNames) {
    if (!expected.has(name)) failures.push(`unexpected output ${name}`);
  }
  for (const [name, source] of expected) {
    if (!actualNames.has(name)) {
      failures.push(`missing output ${name}`);
      continue;
    }
    const actual = await Deno.readTextFile(new URL(name, directory));
    if (actual !== source) failures.push(`stale output ${name}`);
  }
  if (failures.length > 0) {
    throw new Error(`Generated REST clients are not current:\n${failures.join("\n")}`);
  }
}

type GeneratedDirectoryReplacementOptions = {
  /** Test-only failure injection after the generated tree swap and before the manifest swap. */
  afterGeneratedSwap?: () => Promise<void> | void;
  manifest?: { file: URL; source: string };
  validate?: (stage: URL) => Promise<void>;
};

/** Stage, validate, and transactionally replace a complete generated source tree. */
export async function replaceGeneratedDirectory(
  directory: URL,
  sources: ReadonlyMap<string, string>,
  options: GeneratedDirectoryReplacementOptions = {},
): Promise<void> {
  const parent = new URL("../", directory);
  await Deno.mkdir(parent, { recursive: true });
  const nonce = crypto.randomUUID();
  const stage = new URL(`.generated-stage-${nonce}/`, parent);
  const backup = new URL(`.generated-backup-${nonce}/`, parent);
  const manifestStage = options.manifest === undefined
    ? undefined
    : new URL(`.public-names-stage-${nonce}.json`, options.manifest.file);
  const manifestBackup = options.manifest === undefined
    ? undefined
    : new URL(`.public-names-backup-${nonce}.json`, options.manifest.file);
  const hadCurrent = await pathExists(directory);
  const hadManifest = options.manifest !== undefined && await pathExists(options.manifest.file);

  await Deno.mkdir(stage);
  try {
    for (const [name, source] of sources) {
      const destination = new URL(name, stage);
      await Deno.mkdir(new URL("./", destination), { recursive: true });
      await Deno.writeTextFile(destination, source, { createNew: true });
    }
    if (manifestStage !== undefined && options.manifest !== undefined) {
      await Deno.writeTextFile(manifestStage, options.manifest.source, { createNew: true });
    }
    await (options.validate ?? typeCheckGeneratedDirectory)(stage);
    // Client regeneration owns client files; retain colocated E2E artifacts for surviving versions.
    for (const name of sources.keys()) {
      if (!name.endsWith("/client.ts")) continue;
      const testsPath = name.slice(0, -"client.ts".length) + "tests/";
      const currentTests = new URL(testsPath, directory);
      if (await pathExists(currentTests)) {
        await copyGeneratedTests(currentTests, new URL(testsPath, stage));
      }
    }
    // Retired versions lose generated code, but their recorded results remain owned evidence.
    for (const result of await rawResultDirectories(directory)) {
      const destination = new URL(`${result.provider}/${result.version}/tests/results/`, stage);
      if (!(await pathExists(destination))) await copyGeneratedTests(result.directory, destination);
    }

    let movedCurrent = false;
    let movedStage = false;
    let movedManifestCurrent = false;
    let movedManifestStage = false;
    try {
      if (hadCurrent) {
        await Deno.rename(directory, backup);
        movedCurrent = true;
      }
      if (hadManifest && options.manifest !== undefined && manifestBackup !== undefined) {
        await Deno.rename(options.manifest.file, manifestBackup);
        movedManifestCurrent = true;
      }
      await Deno.rename(stage, directory);
      movedStage = true;
      await options.afterGeneratedSwap?.();
      if (manifestStage !== undefined && options.manifest !== undefined) {
        await Deno.rename(manifestStage, options.manifest.file);
        movedManifestStage = true;
      }
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      if (movedManifestStage && options.manifest !== undefined) {
        try {
          await Deno.remove(options.manifest.file);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (movedStage && await pathExists(directory)) {
        try {
          await Deno.remove(directory, { recursive: true });
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (
        movedManifestCurrent && options.manifest !== undefined && manifestBackup !== undefined &&
        await pathExists(manifestBackup)
      ) {
        try {
          await Deno.rename(manifestBackup, options.manifest.file);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (movedCurrent && await pathExists(backup)) {
        try {
          await Deno.rename(backup, directory);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length > 0) throw new AggregateError([error, ...rollbackErrors]);
      throw error;
    }
    if (movedCurrent) await Deno.remove(backup, { recursive: true });
    if (movedManifestCurrent && manifestBackup !== undefined) await Deno.remove(manifestBackup);
  } finally {
    if (await pathExists(stage)) await Deno.remove(stage, { recursive: true });
    if (manifestStage !== undefined && await pathExists(manifestStage)) {
      await Deno.remove(manifestStage);
    }
  }
}

export async function validateGeneratedSources(
  directory: URL,
  sources: ReadonlyMap<string, string>,
  denoConfiguration: URL,
): Promise<void> {
  const parent = new URL("../", directory);
  const stage = new URL(`.generated-validation-${crypto.randomUUID()}/`, parent);
  await Deno.mkdir(stage);
  try {
    for (const [name, source] of sources) {
      const destination = new URL(name, stage);
      await Deno.mkdir(new URL("./", destination), { recursive: true });
      await Deno.writeTextFile(destination, source, { createNew: true });
    }
    await typeCheckGeneratedDirectory(stage, denoConfiguration);
  } finally {
    if (await pathExists(stage)) await Deno.remove(stage, { recursive: true });
  }
}

export async function typeCheckGeneratedDirectory(
  directory: URL,
  denoConfiguration = new URL("deno.json", workspace.root),
): Promise<void> {
  const sourceNames = await generatedSourceNames(directory);
  const output = await new Deno.Command(Deno.execPath(), {
    args: [
      "check",
      "--config",
      decodeURIComponent(denoConfiguration.pathname),
      ...sourceNames.map((name) => decodeURIComponent(new URL(name, directory).pathname)),
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    throw new Error(
      `Staged generated REST clients failed type-check:\n${
        new TextDecoder().decode(output.stderr).trim()
      }`,
    );
  }
}

async function generatedSourceNames(directory: URL, prefix = ""): Promise<string[]> {
  const names: string[] = [];
  const entries = [];
  for await (const entry of Deno.readDir(directory)) entries.push(entry);
  for (const entry of entries.toSorted((left, right) => compareText(left.name, right.name))) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory && entry.name === "tests") continue;
    if (entry.isDirectory) {
      names.push(...await generatedSourceNames(new URL(`${entry.name}/`, directory), `${name}/`));
    } else if (entry.isFile && entry.name.endsWith(".ts")) {
      names.push(name);
    }
  }
  return names;
}

async function copyGeneratedTests(source: URL, destination: URL): Promise<void> {
  await Deno.mkdir(destination, { recursive: true });
  for await (const entry of Deno.readDir(source)) {
    if (entry.isDirectory) {
      await copyGeneratedTests(
        new URL(`${entry.name}/`, source),
        new URL(`${entry.name}/`, destination),
      );
    } else if (entry.isFile) {
      const input = new URL(entry.name, source);
      const output = new URL(entry.name, destination);
      const info = await Deno.stat(input);
      await Deno.copyFile(input, output);
      if (info.atime && info.mtime) await Deno.utime(output, info.atime, info.mtime);
    }
  }
}

async function pathExists(path: URL): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}
