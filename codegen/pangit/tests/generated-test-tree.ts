/** Exact ownership marker written into every generated provider/version E2E directory. */
export const generatedTestOwnershipMarker =
  "# Owned by Generator. Changes in here get nuked on code generation.\n";

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

/**
 * Remove only marker-owned suite files while retaining E2E-owned result directories.
 * Unmarked authored content is rejected instead of being guessed at or deleted.
 */
export async function cleanGeneratedTestArtifacts(providers: URL): Promise<void> {
  if (!await pathExists(providers)) return;
  for (const provider of await sortedEntries(providers)) {
    const providerDirectory = new URL(
      `${encodeURIComponent(provider.name)}${provider.isDirectory ? "/" : ""}`,
      providers,
    );
    if (!provider.isDirectory) {
      throw new Error(
        `Refusing to clean unowned provider test artifact: ${providerDirectory.pathname}`,
      );
    }
    for (const version of await sortedEntries(providerDirectory)) {
      const versionDirectory = new URL(
        `${encodeURIComponent(version.name)}${version.isDirectory ? "/" : ""}`,
        providerDirectory,
      );
      if (!version.isDirectory) {
        throw new Error(
          `Refusing to clean unowned provider test artifact: ${versionDirectory.pathname}`,
        );
      }
      const contents = await sortedEntries(versionDirectory);
      const marker = contents.find((entry) => entry.name === ".generated");
      if (marker === undefined) {
        const unowned = contents.filter((entry) => entry.name !== "results");
        if (unowned.length > 0) {
          throw new Error(
            `Refusing to clean unmarked provider test directory: ${versionDirectory.pathname}`,
          );
        }
        if (contents.length === 0) await Deno.remove(versionDirectory);
        continue;
      }
      if (
        !marker.isFile ||
        await Deno.readTextFile(new URL(".generated", versionDirectory)) !==
          generatedTestOwnershipMarker
      ) {
        throw new Error(`Invalid provider test ownership marker: ${versionDirectory.pathname}`);
      }
      for (const entry of contents) {
        if (entry.name === "results") continue;
        await Deno.remove(
          new URL(
            `${encodeURIComponent(entry.name)}${entry.isDirectory ? "/" : ""}`,
            versionDirectory,
          ),
          { recursive: true },
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
  if ((await sortedEntries(providers)).length === 0) await Deno.remove(providers);
}
