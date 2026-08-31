/** Formatting, validation, and transactional publication of generated client sources. */
import { generatedComment } from "../../generated-notices.ts";
import { workspace } from "../../workspace-layout.ts";
import { compareText } from "./naming.ts";

const ownershipNotice = "Owned by Generator. Changes in here get nuked on code generation.";
const ownershipMarker = `// ${ownershipNotice}\n`;

type GeneratedClientPublicationOptions = {
  /** Test-only failure injection after output swaps and before sidecar swaps. */
  afterOutputSwap?: () => Promise<void> | void;
  manifest?: { file: URL; source: string };
  retiredDirectories?: readonly URL[];
  sidecars?: readonly { file: URL; label: string; source: string }[];
  validate?: (stage: URL) => Promise<void>;
};

type PublicationTarget = {
  backup: URL;
  current: URL;
  label: string;
  staged?: URL;
};

type AppliedTarget = {
  movedCurrent: boolean;
  movedStaged: boolean;
  target: PublicationTarget;
};

type PublicationPlan = {
  emptyDirectoryCandidates: URL[];
  targets: PublicationTarget[];
};

/** Add the root and provider/version ownership markers required by generated output. */
export function withGeneratedOwnershipMarkers(
  sources: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  const marked = new Map(sources);
  marked.set(".generated", ownershipMarker);
  marked.set("runtime/.generated", ownershipMarker);
  for (const versionPath of sourceVersionPaths(sources)) {
    marked.set(`${versionPath}/.generated`, ownershipMarker);
  }
  return marked;
}

export async function formatGeneratedSources(
  sources: ReadonlyMap<string, string>,
  denoConfiguration: URL,
): Promise<ReadonlyMap<string, string>> {
  for (const [name, source] of sources) {
    if ((name === ".generated" || name.endsWith("/.generated")) && source !== ownershipMarker) {
      throw new Error(`Invalid generated ownership marker ${name}`);
    }
  }

  const stagingPath = await Deno.makeTempDir({ prefix: "pangit-codegen-format-" });
  const staging = new URL(`file://${stagingPath.replaceAll("%", "%25")}/`);
  try {
    await writeSourceTree(staging, sources);
    const output = await new Deno.Command(Deno.execPath(), {
      args: [
        "fmt",
        "--config",
        decodeURIComponent(denoConfiguration.pathname),
        decodeURIComponent(staging.pathname),
      ],
      stdout: "null",
      stderr: "piped",
    }).output();
    if (!output.success) {
      throw new Error(
        `Failed to format generated sources: ${new TextDecoder().decode(output.stderr).trim()}`,
      );
    }

    const formatted = new Map<string, string>();
    for (
      const name of [...sources.keys()].toSorted(compareText)
    ) {
      formatted.set(name, await Deno.readTextFile(new URL(name, staging)));
    }
    return formatted;
  } finally {
    await Deno.remove(stagingPath, { recursive: true });
  }
}

export async function assertGeneratedSourcesCurrent(
  directory: URL,
  expected: ReadonlyMap<string, string>,
): Promise<void> {
  assertGeneratedSourceLayout(expected);
  const failures: string[] = [];
  let actualNames: Set<string>;
  try {
    actualNames = new Set(await generatedArtifactNames(directory));
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

/**
 * Stage and validate the complete snapshot, then transactionally publish only managed root files
 * and individual provider/version directories. The generated tree itself is never replaced.
 */
export async function publishGeneratedClientOutput(
  directory: URL,
  sources: ReadonlyMap<string, string>,
  options: GeneratedClientPublicationOptions = {},
): Promise<void> {
  assertGeneratedSourceLayout(sources);
  const parent = new URL("../", directory);
  const sidecars = publicationSidecars(options);
  await Deno.mkdir(parent, { recursive: true });
  const nonce = crypto.randomUUID();
  const transaction = new URL(`.pangit-codegen-transaction-${nonce}/`, parent);
  const stage = new URL(`.pangit-codegen-stage-${nonce}/`, parent);
  const backups = new URL("backups/", transaction);
  await Deno.mkdir(stage, { recursive: true });
  await Deno.mkdir(backups, { recursive: true });

  const sidecarStages = sidecars.map((sidecar, index) => ({
    ...sidecar,
    stage: new URL(`sidecars/${index}`, transaction),
  }));

  const applied: AppliedTarget[] = [];
  const removedEmptyDirectories: URL[] = [];
  try {
    await writeSourceTree(stage, sources);
    for (const sidecar of sidecarStages) {
      await Deno.mkdir(parentDirectory(sidecar.stage), { recursive: true });
      await Deno.writeTextFile(sidecar.stage, sidecar.source, { createNew: true });
    }
    await (options.validate ?? typeCheckGeneratedDirectory)(stage);

    const plan = await publicationPlan(
      directory,
      stage,
      sources,
      backups,
      options.retiredDirectories,
    );
    for (const target of plan.targets) await applyTarget(target, applied);
    removedEmptyDirectories.push(
      ...await removeEmptyDirectories(plan.emptyDirectoryCandidates),
    );
    await options.afterOutputSwap?.();

    for (const [index, sidecar] of sidecarStages.entries()) {
      await applyTarget(
        {
          backup: new URL(`${plan.targets.length + index}`, backups),
          current: sidecar.file,
          label: sidecar.label,
          staged: sidecar.stage,
        },
        applied,
      );
    }
  } catch (error) {
    const rollbackErrors = await rollbackTargets(applied);
    rollbackErrors.push(...await restoreEmptyDirectories(removedEmptyDirectories));
    if (rollbackErrors.length > 0) throw new AggregateError([error, ...rollbackErrors]);
    throw error;
  } finally {
    if (await pathExists(stage)) await Deno.remove(stage, { recursive: true });
    if (await pathExists(transaction)) await Deno.remove(transaction, { recursive: true });
  }
}

function publicationSidecars(
  options: GeneratedClientPublicationOptions,
): Array<{ file: URL; label: string; source: string }> {
  const sidecars = [
    ...(options.manifest === undefined
      ? []
      : [{ ...options.manifest, label: "public-name manifest" }]),
    ...(options.sidecars ?? []),
  ];
  const files = new Set<string>();
  for (const sidecar of sidecars) {
    if (files.has(sidecar.file.href)) {
      throw new Error(`Duplicate generated publication sidecar: ${sidecar.file.pathname}`);
    }
    files.add(sidecar.file.href);
  }
  return sidecars;
}

export async function validateGeneratedSources(
  directory: URL,
  sources: ReadonlyMap<string, string>,
  denoConfiguration: URL,
): Promise<void> {
  assertGeneratedSourceLayout(sources);
  const parent = new URL("../", directory);
  const stage = new URL(`.pangit-codegen-validation-${crypto.randomUUID()}/`, parent);
  await Deno.mkdir(stage, { recursive: true });
  try {
    await writeSourceTree(stage, sources);
    await typeCheckGeneratedDirectory(stage, denoConfiguration);
  } finally {
    if (await pathExists(stage)) await Deno.remove(stage, { recursive: true });
  }
}

export async function typeCheckGeneratedDirectory(
  directory: URL,
  denoConfiguration = new URL("deno.json", workspace.root),
): Promise<void> {
  const entrypoint = new URL("mod.ts", directory);
  if (!(await pathExists(entrypoint))) throw new Error("Generated client snapshot has no mod.ts");
  const output = await new Deno.Command(Deno.execPath(), {
    args: [
      "check",
      "--config",
      decodeURIComponent(denoConfiguration.pathname),
      decodeURIComponent(entrypoint.pathname),
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
  await assertGeneratedDependencyBoundary(directory, denoConfiguration);
}

type DenoInfoResolution = { readonly specifier?: string };
type DenoInfoDependency = {
  readonly code?: DenoInfoResolution;
  readonly type?: DenoInfoResolution;
};
type DenoInfoModule = {
  readonly dependencies?: readonly DenoInfoDependency[];
  readonly specifier?: string;
};
type DenoInfoGraph = { readonly modules?: readonly DenoInfoModule[] };

/** Reject every generated module dependency that resolves outside the generated provider root. */
async function assertGeneratedDependencyBoundary(
  directory: URL,
  denoConfiguration: URL,
): Promise<void> {
  const root = directory.href.endsWith("/") ? directory.href : `${directory.href}/`;
  const entrypoint = new URL("mod.ts", directory);
  const output = await new Deno.Command(Deno.execPath(), {
    args: [
      "info",
      "--json",
      "--config",
      decodeURIComponent(denoConfiguration.pathname),
      decodeURIComponent(entrypoint.pathname),
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    throw new Error(
      `Failed to inspect staged generated REST client dependencies:\n${
        new TextDecoder().decode(output.stderr).trim()
      }`,
    );
  }

  const graph = JSON.parse(new TextDecoder().decode(output.stdout)) as DenoInfoGraph;
  for (const module of graph.modules ?? []) {
    if (module.specifier === undefined || !module.specifier.startsWith(root)) continue;
    const localSource = await Deno.readTextFile(new URL(module.specifier));
    if (hasNonLiteralDynamicImport(localSource)) {
      throw new Error(
        `Generated provider module contains a non-literal dynamic import: ${module.specifier}`,
      );
    }
    for (const dependency of module.dependencies ?? []) {
      for (const resolution of [dependency.code, dependency.type]) {
        const dependencySpecifier = resolution?.specifier;
        if (dependencySpecifier === undefined || dependencySpecifier.startsWith(root)) continue;
        throw new Error(
          `Generated provider module imports outside its generated root: ${module.specifier} -> ${dependencySpecifier}`,
        );
      }
    }
  }
}

function hasNonLiteralDynamicImport(source: string): boolean {
  let index = 0;
  while (index < source.length) {
    if (source.startsWith("//", index)) {
      const newline = source.indexOf("\n", index + 2);
      index = newline < 0 ? source.length : newline + 1;
      continue;
    }
    if (source.startsWith("/*", index)) {
      const close = source.indexOf("*/", index + 2);
      index = close < 0 ? source.length : close + 2;
      continue;
    }
    const character = source[index];
    if (character === '"' || character === "'" || character === "`") {
      index = skipQuotedSource(source, index, character);
      continue;
    }
    if (
      source.startsWith("import", index) && !isIdentifierPart(source[index - 1]) &&
      !isIdentifierPart(source[index + "import".length])
    ) {
      let argument = skipSourceTrivia(source, index + "import".length);
      if (source[argument] === "(") {
        argument = skipSourceTrivia(source, argument + 1);
        if (source[argument] !== '"' && source[argument] !== "'") return true;
      }
    }
    index++;
  }
  return false;
}

function skipSourceTrivia(source: string, start: number): number {
  let index = start;
  while (index < source.length) {
    if (/\s/.test(source[index])) {
      index++;
      continue;
    }
    if (source.startsWith("//", index)) {
      const newline = source.indexOf("\n", index + 2);
      index = newline < 0 ? source.length : newline + 1;
      continue;
    }
    if (source.startsWith("/*", index)) {
      const close = source.indexOf("*/", index + 2);
      index = close < 0 ? source.length : close + 2;
      continue;
    }
    break;
  }
  return index;
}

function skipQuotedSource(source: string, start: number, quote: string): number {
  let index = start + 1;
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }
    if (source[index] === quote) return index + 1;
    index++;
  }
  return source.length;
}

function isIdentifierPart(character: string | undefined): boolean {
  return character !== undefined && /[A-Za-z\d_$]/.test(character);
}

function assertGeneratedSourceLayout(sources: ReadonlyMap<string, string>): void {
  if (sources.get(".generated") !== ownershipMarker) {
    throw new Error("Generated client root is missing its .generated ownership marker");
  }
  if (!sources.has("mod.ts")) throw new Error("Generated client root is missing mod.ts");
  for (const [name, source] of sources) {
    if (name === "mod.ts" || name.endsWith("/mod.ts") || name.endsWith("/index.ts")) {
      assertBarrelModule(name, source);
    }
  }
  for (
    const required of [
      "clients.ts",
      "managed-client.ts",
      "provider.ts",
      "registry.ts",
      "versions.ts",
    ]
  ) {
    if (!sources.has(required)) {
      throw new Error(`Generated provider registry is missing ${required}`);
    }
  }
  if (sources.get("runtime/.generated") !== ownershipMarker) {
    throw new Error("Generated runtime is missing its .generated ownership marker");
  }
  if (!sources.has("runtime/mod.ts")) {
    throw new Error("Generated runtime is missing mod.ts");
  }

  const versionPaths = sourceVersionPaths(sources);
  if (versionPaths.length === 0) {
    throw new Error("Generated client snapshot has no provider versions");
  }
  for (const versionPath of versionPaths) {
    for (
      const required of ["mod.ts"]
    ) {
      if (!sources.has(`${versionPath}/${required}`)) {
        throw new Error(`Generated provider version is missing ${required}: ${versionPath}`);
      }
    }
    if (sources.get(`${versionPath}/.generated`) !== ownershipMarker) {
      throw new Error(
        `Generated provider version is missing its .generated marker: ${versionPath}`,
      );
    }
    const versionArtifacts = [...sources.keys()].filter((name) => {
      const segments = name.split("/");
      return segments.length === 3 && `${segments[0]}/${segments[1]}` === versionPath;
    });
    const clientModules = versionArtifacts.filter((name) => name.endsWith("RestClient.ts"));
    if (clientModules.length !== 1) {
      throw new Error(
        `Generated provider version must contain exactly one REST client module: ${versionPath}`,
      );
    }
    if (versionArtifacts.length !== 3) {
      throw new Error(
        `Generated provider version contains files outside its marker, barrel, and REST client: ${versionPath}`,
      );
    }
    const clientFile = clientModules[0].slice(versionPath.length + 1);
    const expectedBarrel = `${generatedComment("//")}export * from ${
      JSON.stringify(`./${clientFile}`)
    };\n`;
    if (sources.get(`${versionPath}/mod.ts`) !== expectedBarrel) {
      throw new Error(
        `Generated provider barrel does not re-export its REST client: ${versionPath}`,
      );
    }
  }
}

function assertBarrelModule(name: string, source: string): void {
  const declaration =
    /^(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface|const|let|var|function|enum|namespace)\b|^export\s+type\s+[A-Za-z_$]/m;
  if (declaration.test(source)) {
    throw new Error(`Generated barrel contains a definition: ${name}`);
  }
}

function sourceVersionPaths(sources: ReadonlyMap<string, string>): string[] {
  const paths = new Set<string>();
  for (const name of sources.keys()) {
    assertSafeRelativePath(name);
    if (!name.includes("/")) continue;
    const segments = name.split("/");
    if (segments[0] === "runtime") continue;
    if (segments.length !== 3 || segments[0].length === 0 || segments[1].length === 0) {
      throw new Error(`Generated source is outside a provider/version directory: ${name}`);
    }
    paths.add(segments.slice(0, 2).join("/"));
  }
  return [...paths].toSorted(compareText);
}

async function publicationPlan(
  directory: URL,
  stage: URL,
  sources: ReadonlyMap<string, string>,
  backups: URL,
  retiredDirectories: readonly URL[] = [],
): Promise<PublicationPlan> {
  const versionPaths = sourceVersionPaths(sources);
  const targets: Omit<PublicationTarget, "backup">[] = [];
  const emptyDirectoryCandidates = new Map<string, URL>();

  await assertGeneratedRootIsOwned(directory);
  for (const name of sources.keys()) {
    if (name.includes("/")) continue;
    targets.push({
      current: new URL(name, directory),
      label: name,
      staged: new URL(name, stage),
    });
  }
  const runtime = new URL("runtime/", directory);
  if (await pathExists(runtime) && !(await isOwnedGeneratedDirectory(runtime))) {
    throw new Error("Refusing to replace unmarked generated runtime");
  }
  targets.push({
    current: runtime,
    label: "runtime",
    staged: new URL("runtime/", stage),
  });
  for (const versionPath of versionPaths) {
    const current = new URL(`${versionPath}/`, directory);
    if (await pathExists(current) && !(await isOwnedGeneratedDirectory(current))) {
      throw new Error(`Refusing to replace unmarked provider version ${versionPath}`);
    }
    targets.push({
      current,
      label: versionPath,
      staged: new URL(`${versionPath}/`, stage),
    });
  }

  const desiredVersions = new Set(versionPaths);
  for (const stale of await ownedGeneratedVersions(directory)) {
    if (!desiredVersions.has(stale.path)) {
      targets.push({ current: stale.directory, label: `retired ${stale.path}` });
      const providerDirectory = parentDirectory(stale.directory);
      emptyDirectoryCandidates.set(providerDirectory.href, providerDirectory);
    }
  }

  for (const retired of retiredDirectories) {
    if (retired.href === directory.href) {
      throw new Error(`Generated output cannot retire its active root: ${retired.pathname}`);
    }
    if (retired.href.startsWith(directory.href) || directory.href.startsWith(retired.href)) {
      throw new Error(`Generated roots may not contain one another: ${retired.pathname}`);
    }
    if (!await pathExists(retired)) continue;
    if (!await isOwnedGeneratedDirectory(retired)) {
      throw new Error(`Refusing to retire unmarked generated root: ${retired.pathname}`);
    }
    targets.push({
      current: retired,
      label: `retired generated root ${retired.pathname}`,
    });
  }

  return {
    emptyDirectoryCandidates: [...emptyDirectoryCandidates.values()].toSorted((left, right) =>
      compareText(right.pathname, left.pathname)
    ),
    targets: targets
      .toSorted((left, right) => compareText(left.label, right.label))
      .map((target, index) => ({ ...target, backup: new URL(`${index}`, backups) })),
  };
}

async function applyTarget(target: PublicationTarget, applied: AppliedTarget[]): Promise<void> {
  const state: AppliedTarget = { movedCurrent: false, movedStaged: false, target };
  applied.push(state);
  if (await pathExists(target.current)) {
    await Deno.mkdir(parentDirectory(target.backup), { recursive: true });
    await Deno.rename(target.current, target.backup);
    state.movedCurrent = true;
  }
  if (target.staged !== undefined) {
    await Deno.mkdir(parentDirectory(target.current), { recursive: true });
    await Deno.rename(target.staged, target.current);
    state.movedStaged = true;
  }
}

async function rollbackTargets(applied: readonly AppliedTarget[]): Promise<unknown[]> {
  const errors: unknown[] = [];
  for (const state of [...applied].reverse()) {
    if (state.movedStaged && await pathExists(state.target.current)) {
      try {
        await Deno.remove(state.target.current, { recursive: true });
      } catch (error) {
        errors.push(error);
      }
    }
    if (state.movedCurrent && await pathExists(state.target.backup)) {
      try {
        await Deno.mkdir(parentDirectory(state.target.current), { recursive: true });
        await Deno.rename(state.target.backup, state.target.current);
      } catch (error) {
        errors.push(error);
      }
    }
  }
  return errors;
}

async function removeEmptyDirectories(directories: readonly URL[]): Promise<URL[]> {
  const removed: URL[] = [];
  for (const directory of directories) {
    if (!(await pathExists(directory))) continue;
    if ((await sortedDirectoryEntries(directory)).length > 0) continue;
    await Deno.remove(directory);
    removed.push(directory);
  }
  return removed;
}

async function restoreEmptyDirectories(directories: readonly URL[]): Promise<unknown[]> {
  const errors: unknown[] = [];
  for (const directory of [...directories].reverse()) {
    try {
      await Deno.mkdir(directory, { recursive: true });
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

async function ownedGeneratedVersions(
  directory: URL,
): Promise<Array<{ directory: URL; path: string }>> {
  const versions: Array<{ directory: URL; path: string }> = [];
  if (!(await pathExists(directory))) return versions;
  for (const provider of await sortedDirectoryEntries(directory)) {
    if (!provider.isDirectory || provider.name === "runtime") continue;
    const providerDirectory = new URL(`${encodeURIComponent(provider.name)}/`, directory);
    for (const version of await sortedDirectoryEntries(providerDirectory)) {
      if (!version.isDirectory) continue;
      const versionDirectory = new URL(`${encodeURIComponent(version.name)}/`, providerDirectory);
      if (await isOwnedGeneratedDirectory(versionDirectory)) {
        versions.push({
          directory: versionDirectory,
          path: `${provider.name}/${version.name}`,
        });
      }
    }
  }
  return versions;
}

async function isOwnedGeneratedDirectory(directory: URL): Promise<boolean> {
  try {
    return await Deno.readTextFile(new URL(".generated", directory)) === ownershipMarker;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function assertGeneratedRootIsOwned(directory: URL): Promise<void> {
  const marker = new URL(".generated", directory);
  if (await pathExists(marker)) {
    if (await Deno.readTextFile(marker) !== ownershipMarker) {
      throw new Error(`Invalid generated root ownership marker: ${directory.pathname}`);
    }
    return;
  }
  if (await pathExists(directory)) {
    throw new Error(`Refusing to replace unmarked generated root: ${directory.pathname}`);
  }
}

async function writeSourceTree(
  directory: URL,
  sources: ReadonlyMap<string, string>,
): Promise<void> {
  for (const [name, source] of sources) {
    const destination = new URL(name, directory);
    await Deno.mkdir(new URL("./", destination), { recursive: true });
    await Deno.writeTextFile(destination, source, { createNew: true });
  }
}

async function generatedArtifactNames(directory: URL, prefix = ""): Promise<string[]> {
  const names: string[] = [];
  for (const entry of await sortedDirectoryEntries(directory)) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory) {
      names.push(...await generatedArtifactNames(new URL(`${entry.name}/`, directory), `${name}/`));
    } else {
      names.push(name);
    }
  }
  return names;
}

async function sortedDirectoryEntries(directory: URL): Promise<Deno.DirEntry[]> {
  const entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(directory)) entries.push(entry);
  return entries.toSorted((left, right) => compareText(left.name, right.name));
}

function assertSafeRelativePath(path: string): void {
  const segments = path.split("/");
  if (
    path.startsWith("/") || path.includes("\\") ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid generated source path ${path}`);
  }
}

function parentDirectory(path: URL): URL {
  return new URL(".", path.href.endsWith("/") ? path.href.slice(0, -1) : path.href);
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
