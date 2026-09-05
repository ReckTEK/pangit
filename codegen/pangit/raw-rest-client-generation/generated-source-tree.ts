/** Filesystem and ownership conventions for generated client snapshots. */
import { compareText } from "./naming.ts";

const ownershipNotice = "Owned by Generator. Changes in here get nuked on code generation.";
export const ownershipMarker = `// ${ownershipNotice}\n`;
export function sourceVersionPaths(sources: ReadonlyMap<string, string>): string[] {
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

export async function writeSourceTree(
  directory: URL,
  sources: ReadonlyMap<string, string>,
): Promise<void> {
  for (const [name, source] of sources) {
    const destination = new URL(name, directory);
    await Deno.mkdir(new URL("./", destination), { recursive: true });
    await Deno.writeTextFile(destination, source, { createNew: true });
  }
}

export async function generatedArtifactNames(directory: URL, prefix = ""): Promise<string[]> {
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

export async function sortedDirectoryEntries(directory: URL): Promise<Deno.DirEntry[]> {
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

export function parentDirectory(path: URL): URL {
  return new URL(".", path.href.endsWith("/") ? path.href.slice(0, -1) : path.href);
}

export async function pathExists(path: URL): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}
