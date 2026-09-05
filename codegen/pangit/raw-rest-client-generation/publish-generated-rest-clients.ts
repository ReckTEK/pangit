/** Formatting, validation, and transactional publication of generated client sources. */
import { compareText } from "./naming.ts";
import {
  assertGeneratedSourceLayout,
  typeCheckGeneratedDirectory,
} from "./validate-generated-sources.ts";
import {
  generatedArtifactNames,
  ownershipMarker,
  parentDirectory,
  pathExists,
  sortedDirectoryEntries,
  sourceVersionPaths,
  writeSourceTree,
} from "./generated-source-tree.ts";

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
 * Stage and validate the complete snapshot, then transactionally publish the root-file snapshot
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

  const sidecarStages = sidecars.map((sidecar, index) => ({
    ...sidecar,
    stage: new URL(`sidecars/${index}`, transaction),
  }));

  const applied: AppliedTarget[] = [];
  const removedEmptyDirectories: URL[] = [];
  let retainRecovery = false;
  let failure: unknown;
  let failed = false;
  try {
    await Deno.mkdir(stage, { recursive: true });
    await Deno.mkdir(backups, { recursive: true });
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
    const sidecarTargets: PublicationTarget[] = sidecarStages.map((sidecar, index) => ({
      backup: new URL(`${plan.targets.length + index}`, backups),
      current: sidecar.file,
      label: sidecar.label,
      staged: sidecar.stage,
    }));
    // Record where originals belong before any move; a failed rollback must remain recoverable.
    await Deno.writeTextFile(
      new URL("recovery.json", transaction),
      JSON.stringify(
        [...plan.targets, ...sidecarTargets].map((target) => ({
          original: target.current.href,
          backup: target.backup.href,
        })),
        null,
        2,
      ) + "\n",
    );
    for (const target of plan.targets) await applyTarget(target, applied);
    await removeEmptyDirectories(plan.emptyDirectoryCandidates, removedEmptyDirectories);
    await options.afterOutputSwap?.();

    for (const target of sidecarTargets) await applyTarget(target, applied);
  } catch (error) {
    failed = true;
    retainRecovery = true;
    const rollbackErrors = await rollbackTargets(applied);
    rollbackErrors.push(...await restoreEmptyDirectories(removedEmptyDirectories));
    failure = rollbackErrors.length > 0
      ? new AggregateError(
        [error, ...rollbackErrors],
        `Generated publication rollback failed; recovery files retained at ${transaction.pathname}`,
      )
      : error;
    retainRecovery = rollbackErrors.length > 0;
  }
  const cleanupErrors: unknown[] = [];
  for (const temporary of retainRecovery ? [stage] : [stage, transaction]) {
    try {
      if (await pathExists(temporary)) await Deno.remove(temporary, { recursive: true });
    } catch (error) {
      cleanupErrors.push(new Error(`Could not remove ${temporary.pathname}`, { cause: error }));
    }
  }
  if (cleanupErrors.length > 0) {
    throw new AggregateError(
      [...(failed ? [failure] : []), ...cleanupErrors],
      `Generated publication cleanup failed; inspect ${transaction.pathname} and ${stage.pathname}`,
    );
  }
  if (failed) throw failure;
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
  const desiredRootFiles = new Set(
    [...sources.keys()].filter((name) => !name.includes("/")),
  );
  for (const name of sources.keys()) {
    if (name.includes("/")) continue;
    targets.push({
      current: new URL(name, directory),
      label: name,
      staged: new URL(name, stage),
    });
  }
  if (await pathExists(directory)) {
    for (const entry of await sortedDirectoryEntries(directory)) {
      if (entry.isDirectory || desiredRootFiles.has(entry.name)) continue;
      targets.push({
        current: new URL(encodeURIComponent(entry.name), directory),
        label: `retired root file ${entry.name}`,
      });
    }
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
    try {
      if (state.movedCurrent && !await pathExists(state.target.backup)) {
        throw new Error(`Original backup is missing: ${state.target.backup.pathname}`);
      }
      if (state.movedStaged && await pathExists(state.target.current)) {
        await Deno.remove(state.target.current, { recursive: true });
      }
      if (state.movedCurrent) {
        await Deno.mkdir(parentDirectory(state.target.current), { recursive: true });
        await Deno.rename(state.target.backup, state.target.current);
      }
    } catch (error) {
      errors.push(
        new Error(`Could not restore ${state.target.current.pathname}`, { cause: error }),
      );
    }
  }
  return errors;
}

async function removeEmptyDirectories(directories: readonly URL[], removed: URL[]): Promise<void> {
  for (const directory of directories) {
    if (!(await pathExists(directory))) continue;
    if ((await sortedDirectoryEntries(directory)).length > 0) continue;
    await Deno.remove(directory);
    removed.push(directory);
  }
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
