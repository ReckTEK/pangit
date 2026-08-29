import { generatedComment } from "../notices.ts";
import { workspace, type WorkspacePaths } from "../workspace.ts";
import {
  describeClientOperations,
  type RestClientPublicNamesManifest,
} from "../generator/generate.ts";
import {
  asObject,
  httpMethods,
  objectEntries,
  parseOpenApiDocument,
} from "../generator/openapi.ts";
import { compareText } from "../generator/naming.ts";
import { type RawSpecManifest, sha256 } from "../specs/fetch.ts";
import type {
  DocumentationManifest,
  DocumentationOperation,
  DocumentationProvider,
} from "@mannsion/pangit-site/documentation";

const outputPrefix = "app/documentation/generated/";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Render all artifacts before touching the existing documentation. No network or timestamps. */
export async function renderDocumentation(
  paths: WorkspacePaths = workspace,
): Promise<Map<string, string>> {
  const libraryRoot = paths.packages.pangit;
  const specManifest: RawSpecManifest = JSON.parse(
    await Deno.readTextFile(new URL("specs/raw/manifest.json", paths.codegen)),
  );
  const publicNames: RestClientPublicNamesManifest = JSON.parse(
    await Deno.readTextFile(new URL("generator/public-names.json", paths.codegen)),
  );
  const config = JSON.parse(await Deno.readTextFile(new URL("deno.json", libraryRoot)));
  if (specManifest.schemaVersion !== 1 || publicNames.version !== 1) {
    throw new Error("Unsupported specification or public-name manifest version");
  }
  const files = new Map<string, string>();
  const providers: DocumentationProvider[] = [];
  const operationImports: string[] = [];
  for (const [id, provider] of Object.entries(specManifest.providers)) {
    if (!provider.versions[provider.selected] || !publicNames.providers[id]) {
      throw new Error(`Missing selected specification or public names for ${id}`);
    }
    const entry: DocumentationProvider = {
      id,
      name: provider.name,
      kind: provider.kind,
      upstream: provider.upstream,
      selected: provider.selected,
      client: provider.client,
      versions: [],
    };
    for (const [version, spec] of Object.entries(provider.versions)) {
      const text = await Deno.readTextFile(new URL(spec.artifacts.normalized, paths.root));
      const document = parseOpenApiDocument(text, `${id}/${version}`);
      const operations: DocumentationOperation[] = describeClientOperations(
        document,
        publicNames.providers[id],
      ).map(({ description: _description, ...operation }) => operation);
      const methods = new Set(operations.map((operation) => operation.methodName));
      if (operations.length === 0 || methods.size !== operations.length) {
        throw new Error(`Empty or duplicate method index for ${id}/${version}`);
      }
      const variants: DocumentationProvider["versions"][number]["variants"] = [];
      for (const [path, item] of objectEntries(document["x-ms-paths"])) {
        for (const method of httpMethods) {
          const raw = asObject(asObject(item)?.[method]);
          if (!raw) continue;
          const operation = operations.find((entry) =>
            entry.source.collection === "x-ms-paths" && entry.source.path === path &&
            entry.method === method.toUpperCase()
          );
          if (!operation) {
            throw new Error(`Unmapped query variant: ${id}/${version} ${method} ${path}`);
          }
          operation.variant = operation.methodName;
          variants.push({
            id: operation.methodName,
            method,
            path,
            label: operation.summary ?? operation.operationId,
          });
        }
      }
      const artifacts = spec.artifacts.documentation;
      if (!artifacts) throw new Error(`Missing documentation mapping for ${id}/${version}`);
      for (const path of [artifacts.openapi, artifacts.operations]) {
        if (!path.startsWith(outputPrefix) || path.includes("..")) {
          throw new Error(`Invalid documentation artifact path: ${path}`);
        }
      }
      const tags = new Map<string, number>();
      for (const operation of operations) {
        for (const tag of operation.tags.length ? operation.tags : ["default"]) {
          tags.set(tag, (tags.get(tag) ?? 0) + 1);
        }
      }
      files.set(artifacts.openapi.slice(outputPrefix.length), text);
      const operationsPath = artifacts.operations.slice(outputPrefix.length);
      files.set(operationsPath, json(operations));
      operationImports.push(
        `  ${JSON.stringify(`${id}/${version}`)}: () => import(${
          JSON.stringify(`./${operationsPath}`)
        }, { with: { type: "json" } }),`,
      );
      entry.versions.push({
        version,
        route: artifacts.route,
        specUrl: `/openapi/${id}/${version}.json`,
        source: spec.source,
        sourceSha256: spec.sha256,
        sha256: await sha256(text),
        openapi: document.openapi,
        operationCount: operations.length,
        schemaCount: Object.keys(document.components?.schemas ?? {}).length,
        tags: [...tags].toSorted(([a], [b]) => compareText(a, b))
          .map(([name, count]) => ({ name, count })),
        servers: (document.servers ?? []) as { url: string; description?: string }[],
        variants,
        artifacts: { openapi: artifacts.openapi, operations: artifacts.operations },
      });
    }
    providers.push(entry);
  }
  const manifest: DocumentationManifest = {
    schemaVersion: 1,
    package: { name: config.name, version: config.version },
    providers,
  };
  files.set("manifest.json", json(manifest));
  files.set(
    "loaders.ts",
    generatedComment("//") +
      `export const operationLoaders = {\n${operationImports.join("\n")}\n};\n`,
  );
  return files;
}

async function listFiles(directory: URL, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory) {
      files.push(...await listFiles(new URL(`${entry.name}/`, directory), `${path}/`));
    } else if (entry.isFile) files.push(path);
  }
  return files.sort();
}

/** Atomically replace the documentation tree, or check it without writing. */
export async function generateDocumentation(
  options: { workspace?: WorkspacePaths; check?: boolean } = {},
): Promise<void> {
  const paths = options.workspace ?? workspace;
  const files = await renderDocumentation(paths);
  const output = new URL(outputPrefix, paths.packages.site);
  if (options.check) {
    const actual = await listFiles(output);
    if (actual.length !== files.size) throw new Error("Documentation artifact inventory is stale");
    for (const [path, text] of files) {
      if (await Deno.readTextFile(new URL(path, output)) !== text) {
        throw new Error(`Stale documentation artifact: ${path}`);
      }
    }
    return;
  }
  const parent = new URL("../", output);
  await Deno.mkdir(parent, { recursive: true });
  const nonce = crypto.randomUUID();
  const stage = new URL(`.docs-stage-${nonce}/`, parent);
  const backup = new URL(`.docs-backup-${nonce}/`, parent);
  let backedUp = false;
  await Deno.mkdir(stage);
  try {
    for (const [path, text] of files) {
      const target = new URL(path, stage);
      await Deno.mkdir(new URL("./", target), { recursive: true });
      await Deno.writeTextFile(target, text);
    }
    try {
      await Deno.rename(output, backup);
      backedUp = true;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    try {
      await Deno.rename(stage, output);
    } catch (error) {
      if (backedUp) await Deno.rename(backup, output);
      throw error;
    }
    if (backedUp) await Deno.remove(backup, { recursive: true });
  } finally {
    await Deno.remove(stage, { recursive: true }).catch((error: unknown) => {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    });
  }
}
