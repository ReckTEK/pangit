import type { LiveTestRelease } from "../runner/discover-generated-live-tests.ts";

/** Marker proving that one live-test result directory may be replaced by the E2E command. */
export const liveTestResultOwnershipMarker =
  "# Owned by deno task e2e. Changes in here get nuked on the next E2E run.\n";

async function pathExists(path: URL): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function sortedEntries(directory: URL): Promise<Deno.DirEntry[]> {
  const entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(directory)) entries.push(entry);
  return entries.toSorted((left, right) => left.name.localeCompare(right.name));
}

async function clearResultDirectory(directory: URL): Promise<void> {
  await Deno.mkdir(directory, { recursive: true });
  const entries = await sortedEntries(directory);
  if (entries.length > 0) {
    const marker = new URL(".generated", directory);
    if (
      !await pathExists(marker) ||
      await Deno.readTextFile(marker) !== liveTestResultOwnershipMarker
    ) {
      throw new Error(`Refusing to replace unowned E2E results: ${directory.pathname}`);
    }
  }
  for (const entry of entries) {
    await Deno.remove(
      new URL(`${encodeURIComponent(entry.name)}${entry.isDirectory ? "/" : ""}`, directory),
      { recursive: true },
    );
  }
  await Deno.writeTextFile(new URL(".generated", directory), liveTestResultOwnershipMarker);
}

/**
 * Clear every active result directory and remove obsolete E2E-owned Git-host/version evidence.
 */
export async function prepareResultDirectories(
  resultsRoot: URL,
  releases: readonly LiveTestRelease[],
): Promise<void> {
  const expected = new Set(releases.map((release) => release.results.href));
  if (await pathExists(resultsRoot)) {
    for (const gitHost of await sortedEntries(resultsRoot)) {
      const gitHostDirectory = new URL(
        `${encodeURIComponent(gitHost.name)}${gitHost.isDirectory ? "/" : ""}`,
        resultsRoot,
      );
      if (!gitHost.isDirectory) {
        throw new Error(`Unexpected Git-host test artifact: ${gitHostDirectory.pathname}`);
      }
      for (const version of await sortedEntries(gitHostDirectory)) {
        const versionDirectory = new URL(
          `${encodeURIComponent(version.name)}${version.isDirectory ? "/" : ""}`,
          gitHostDirectory,
        );
        if (!version.isDirectory) {
          throw new Error(`Unexpected Git-host test artifact: ${versionDirectory.pathname}`);
        }
        if (!expected.has(versionDirectory.href)) {
          const marker = new URL(".generated", versionDirectory);
          if (
            !await pathExists(marker) ||
            await Deno.readTextFile(marker) !== liveTestResultOwnershipMarker
          ) {
            throw new Error(`Refusing to remove unowned E2E results: ${versionDirectory.pathname}`);
          }
          await Deno.remove(versionDirectory, { recursive: true });
          continue;
        }
      }
      if ((await sortedEntries(gitHostDirectory)).length === 0) {
        await Deno.remove(gitHostDirectory);
      }
    }
  }
  for (const release of releases) await clearResultDirectory(release.results);
}

/** Verify that a result directory belongs to E2E before publishing from it. */
export async function assertLiveTestResultOwnership(directory: URL): Promise<void> {
  const marker = new URL(".generated", directory);
  if (
    !await pathExists(marker) ||
    await Deno.readTextFile(marker) !== liveTestResultOwnershipMarker
  ) {
    throw new Error(`Invalid E2E result ownership marker: ${directory.pathname}`);
  }
}
