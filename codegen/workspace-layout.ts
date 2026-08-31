import { relative } from "node:path";
import { fileURLToPath } from "node:url";

export interface WorkspacePaths {
  root: URL;
  codegen: {
    root: URL;
    pangit: URL;
    pangitSite: URL;
  };
  packages: {
    pangit: URL;
    site: URL;
  };
}

/** Package locations have one owner: the root deno.json workspace list. */
export async function readWorkspace(
  root = new URL("../", import.meta.url),
): Promise<WorkspacePaths> {
  const configuration = JSON.parse(await Deno.readTextFile(new URL("deno.json", root)));
  if (!Array.isArray(configuration.workspace)) {
    throw new Error("The root deno.json must configure workspace package paths");
  }
  const packages = new Map<string, URL>();
  for (const member of configuration.workspace) {
    if (typeof member !== "string" || !member.startsWith("./") || member.includes("..")) {
      throw new Error(`Invalid workspace package path: ${String(member)}`);
    }
    const directory = new URL(`${member.replace(/\/$/, "")}/`, root);
    const { name } = JSON.parse(await Deno.readTextFile(new URL("deno.json", directory)));
    if (typeof name !== "string" || packages.has(name)) {
      throw new Error(`Missing or duplicate workspace package name in ${member}/deno.json`);
    }
    packages.set(name, directory);
  }
  const resolve = (name: string): URL => {
    const directory = packages.get(name);
    if (!directory) throw new Error(`Workspace package is not configured: ${name}`);
    return directory;
  };
  return {
    root,
    codegen: {
      root: new URL("codegen/", root),
      pangit: new URL("codegen/pangit/", root),
      pangitSite: new URL("codegen/pangit-site/", root),
    },
    packages: {
      pangit: resolve("@mannsion/pangit"),
      site: resolve("@mannsion/pangit-site"),
    },
  };
}

/** Portable relative paths for Markdown links and generated Compose mounts. */
export function relativePath(from: URL, to: URL): string {
  return relative(fileURLToPath(from), fileURLToPath(to)).replaceAll("\\", "/");
}

export const workspace = await readWorkspace();
