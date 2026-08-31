import type { E2ERelease } from "./e2e-releases.ts";

/** Marker proving that a raw result directory may be replaced by the E2E command. */
export const e2eResultOwnershipMarker =
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
      await Deno.readTextFile(marker) !== e2eResultOwnershipMarker
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
  await Deno.writeTextFile(new URL(".generated", directory), e2eResultOwnershipMarker);
}

/**
 * Clear every manifest-owned result directory before a run and remove obsolete E2E-owned results.
 * Unexpected suite files are rejected so code generation, rather than E2E, remains their owner.
 */
export async function prepareE2EResultTree(
  providers: URL,
  releases: readonly E2ERelease[],
): Promise<void> {
  const expected = new Set(releases.map((release) => release.results.href));
  if (await pathExists(providers)) {
    for (const provider of await sortedEntries(providers)) {
      const providerDirectory = new URL(
        `${encodeURIComponent(provider.name)}${provider.isDirectory ? "/" : ""}`,
        providers,
      );
      if (!provider.isDirectory) {
        throw new Error(`Unexpected provider test artifact: ${providerDirectory.pathname}`);
      }
      for (const version of await sortedEntries(providerDirectory)) {
        const versionDirectory = new URL(
          `${encodeURIComponent(version.name)}${version.isDirectory ? "/" : ""}`,
          providerDirectory,
        );
        if (!version.isDirectory) {
          throw new Error(`Unexpected provider test artifact: ${versionDirectory.pathname}`);
        }
        const results = new URL("results/", versionDirectory);
        if (await pathExists(results) && !expected.has(results.href)) {
          const marker = new URL(".generated", results);
          if (
            !await pathExists(marker) ||
            await Deno.readTextFile(marker) !== e2eResultOwnershipMarker
          ) {
            throw new Error(`Refusing to remove unowned E2E results: ${results.pathname}`);
          }
          await Deno.remove(results, { recursive: true });
        }
        if (!expected.has(results.href) && (await sortedEntries(versionDirectory)).length > 0) {
          throw new Error(
            `Unexpected generated E2E suite: ${versionDirectory.pathname}; run deno task generate`,
          );
        }
        if ((await sortedEntries(versionDirectory)).length === 0) {
          await Deno.remove(versionDirectory);
        }
      }
      if ((await sortedEntries(providerDirectory)).length === 0) {
        await Deno.remove(providerDirectory);
      }
    }
  }
  for (const release of releases) await clearResultDirectory(release.results);
}

/** Verify that a result directory belongs to E2E before publishing from it. */
export async function assertE2EResultOwnership(directory: URL): Promise<void> {
  const marker = new URL(".generated", directory);
  if (!await pathExists(marker) || await Deno.readTextFile(marker) !== e2eResultOwnershipMarker) {
    throw new Error(`Invalid E2E result ownership marker: ${directory.pathname}`);
  }
}
