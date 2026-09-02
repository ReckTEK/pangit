import { workspace, type WorkspacePaths } from "../../workspace-layout.ts";

/** Exact marker required before generation may replace a generated test or Docker environment. */
export const generatedE2EOwnershipMarker =
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

/** Remove only marker-owned provider/version directories under one generated concern root. */
export async function cleanGeneratedE2EConcern(root: URL): Promise<void> {
  if (!await pathExists(root)) return;
  for (const provider of await sortedEntries(root)) {
    const providerDirectory = new URL(
      `${encodeURIComponent(provider.name)}${provider.isDirectory ? "/" : ""}`,
      root,
    );
    if (!provider.isDirectory) {
      throw new Error(`Refusing to clean unexpected generated E2E file: ${providerDirectory}`);
    }
    for (const version of await sortedEntries(providerDirectory)) {
      const versionDirectory = new URL(
        `${encodeURIComponent(version.name)}${version.isDirectory ? "/" : ""}`,
        providerDirectory,
      );
      if (!version.isDirectory) {
        throw new Error(`Refusing to clean unexpected generated E2E file: ${versionDirectory}`);
      }
      const marker = new URL(".generated", versionDirectory);
      if (
        !await pathExists(marker) ||
        await Deno.readTextFile(marker) !== generatedE2EOwnershipMarker
      ) {
        throw new Error(`Refusing to clean unowned generated E2E directory: ${versionDirectory}`);
      }
      await Deno.remove(versionDirectory, { recursive: true });
    }
    await Deno.remove(providerDirectory);
  }
  await Deno.remove(root);
}

/** Clean only the two explicit branches under tests/e2e/generated. */
export async function cleanGeneratedE2EArtifacts(
  paths: WorkspacePaths = workspace,
): Promise<void> {
  await cleanGeneratedE2EConcern(
    new URL("tests/e2e/generated/raw-rest-client-tests/", paths.root),
  );
  await cleanGeneratedE2EConcern(
    new URL("tests/e2e/generated/docker-environments/", paths.root),
  );
}
