/** Check source layout, TypeScript correctness, and dependency isolation before publication. */
import { generatedComment } from "../../generated-notices.ts";
import { workspace } from "../../workspace-layout.ts";
import {
  ownershipMarker,
  pathExists,
  sourceVersionPaths,
  writeSourceTree,
} from "./generated-source-tree.ts";

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

export function assertGeneratedSourceLayout(sources: ReadonlyMap<string, string>): void {
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
      "client-options.ts",
      "create-rest-client.ts",
      "git-host.ts",
      "rest-client-type-map.ts",
      "supported-versions.ts",
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
    const barrel = sources.get(`${versionPath}/mod.ts`);
    const expectedExport = `export * from ${JSON.stringify(`./${clientFile}`)};\n`;
    if (
      barrel === undefined || !barrel.startsWith(generatedComment("//")) ||
      !barrel.endsWith(expectedExport) ||
      barrel.slice(generatedComment("//").length, -expectedExport.length).split("\n").some(
        (line) => line !== "" && !line.startsWith("// "),
      )
    ) {
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
