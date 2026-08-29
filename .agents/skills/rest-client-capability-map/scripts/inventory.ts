/** Inventory checked-in REST schemas and clients without generating code or making API calls. */
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  readPublicNamesManifest,
  readSpecManifest,
} from "../../../../codegen/generator/client-manifests.ts";
import { compareText } from "../../../../codegen/generator/naming.ts";
import { asObject, parseOpenApiDocument } from "../../../../codegen/generator/openapi.ts";
import {
  collectOperations,
  type OperationModel,
} from "../../../../codegen/generator/operations.ts";
import { describeClientOperations } from "../../../../codegen/generator/render.ts";

export type InventoryProvider = { id: string; displayName: string; selected: string };
export type InventorySources = { raw: string; normalized: string; client: string };
export type InventoryClient = {
  id: string;
  provider: string;
  version: string;
  selected: boolean;
  operationCount: number;
  className: string;
  registryName: string;
  sources: InventorySources;
  sourceHashes: InventorySources;
};
export type InventoryOperation = OperationModel & {
  id: string;
  clientId: string;
  provider: string;
  version: string;
  operationKey: string;
  methodName: string;
  className: string;
  source: {
    collection: "paths" | "x-ms-paths";
    /** Original schema path, including Azure query qualifiers and optional path groups. */
    path: string;
    /** JSON Pointer into the normalized document; not the normalized transport path. */
    pointer: string;
    normalized: string;
    client: string;
    clientLine: number;
  };
};
export type Inventory = {
  schemaVersion: 1;
  sourceFingerprint: string;
  providers: InventoryProvider[];
  clients: InventoryClient[];
  operations: InventoryOperation[];
};

const providerOrder = ["gitea", "codeberg", "github", "gitlab", "bitbucket", "azure-devops"];
const manifestPaths = [
  "codegen/specs/providers.json",
  "codegen/specs/raw/manifest.json",
  "codegen/generator/public-names.json",
] as const;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Build a deterministic snapshot. Importing this module does not read or write inventory files. */
export async function buildInventory(
  root: string | URL = new URL("../../../../", import.meta.url),
): Promise<Inventory> {
  const rootPath = resolve(root instanceof URL ? fileURLToPath(root) : root);
  const rootUrl = pathToFileURL(`${rootPath}/`);
  const manifestBytes = await Promise.all(
    manifestPaths.map((path) => Deno.readFile(new URL(path, rootUrl))),
  );
  const configured = record(JSON.parse(decoder.decode(manifestBytes[0])), manifestPaths[0]);
  const rawManifest = record(JSON.parse(decoder.decode(manifestBytes[1])), manifestPaths[1]);
  const rawProviders = record(rawManifest.providers, "raw manifest providers");
  const [manifest, lockedNames] = await Promise.all([
    readSpecManifest(new URL(manifestPaths[1], rootUrl)),
    readPublicNamesManifest(new URL(manifestPaths[2], rootUrl), false),
  ]);
  const providerIds = Object.keys(configured).toSorted(compareProviders);
  if (!providerIds.includes("gitea")) throw new Error("The capability map requires Gitea first");
  sameSet(providerIds, Object.keys(manifest.providers), "configured/raw-manifest providers");
  sameSet(providerIds, Object.keys(lockedNames.providers), "configured/public-name providers");

  const providers: InventoryProvider[] = [];
  const plans: Array<
    Omit<InventoryClient, "operationCount" | "sourceHashes"> & {
      rawMetadata: Record<string, unknown>;
    }
  > = [];
  for (const provider of providerIds) {
    const source = record(configured[provider], `configured provider ${provider}`);
    const rawProvider = record(rawProviders[provider], `raw provider ${provider}`);
    const definition = manifest.providers[provider];
    const versions = record(source.versions, `configured ${provider}.versions`);
    const rawVersions = record(rawProvider.versions, `raw ${provider}.versions`);
    sameSet(Object.keys(versions), Object.keys(definition.versions), `${provider} versions`);
    equal(source.selected, definition.selected, `${provider} selected version`);
    for (const field of ["name", "kind", "upstream"] as const) {
      equal(source[field], rawProvider[field], `${provider} ${field}`);
    }
    const naming = record(source.client, `${provider} client names`);
    for (const field of ["className", "displayName", "namespaceName", "variablePrefix"] as const) {
      nonempty(definition.client[field], `${provider} ${field}`);
      equal(naming[field], definition.client[field], `${provider} ${field}`);
    }
    providers.push({
      id: provider,
      displayName: definition.client.displayName,
      selected: definition.selected,
    });
    const orderedVersions = Object.keys(versions).toSorted((a, b) =>
      Number(b === definition.selected) - Number(a === definition.selected) || compareText(a, b)
    );
    for (const version of orderedVersions) {
      const id = `${provider}@${version}`;
      const versionSource = record(versions[version], `${id} configured source`);
      const rawMetadata = record(rawVersions[version], `${id} raw metadata`);
      const entry = definition.versions[version];
      equal(rawMetadata.format, source.format, `${id} raw format`);
      equal(rawMetadata.source, versionSource.url, `${id} upstream source`);
      equal(rawMetadata.ref ?? null, versionSource.ref ?? null, `${id} upstream ref`);
      equal(
        rawMetadata.containerImage ?? null,
        versionSource.containerImage ?? null,
        `${id} container image`,
      );
      const sources: InventorySources = {
        raw: sourcePath(entry.destination, "codegen/specs/raw/"),
        normalized: sourcePath(entry.artifacts.normalized, "codegen/specs/normalized/"),
        client: `packages/pangit/${sourcePath(entry.artifacts.client, "src/generated/")}`,
      };
      plans.push({
        id,
        provider,
        version,
        selected: version === definition.selected,
        className: definition.client.className,
        registryName: `${definition.client.variablePrefix}Operations`,
        sources,
        rawMetadata,
      });
    }
  }
  // Discover the actual trees as well: a manifest cannot silently omit an existing client/version.
  const [rawFiles, normalizedFiles, clientFiles] = await Promise.all([
    discover(
      rootUrl,
      "codegen/specs/raw/",
      (path) => /\.(json|ya?ml)$/.test(path) && path !== manifestPaths[1],
    ),
    discover(rootUrl, "codegen/specs/normalized/", (path) => path.endsWith(".json")),
    discover(rootUrl, "packages/pangit/src/generated/", (path) => path.endsWith("/client.ts")),
  ]);
  sameSet(plans.map((plan) => plan.sources.raw), rawFiles, "raw source files");
  sameSet(plans.map((plan) => plan.sources.normalized), normalizedFiles, "normalized source files");
  sameSet(plans.map((plan) => plan.sources.client), clientFiles, "generated client files");

  const hashes: Array<[string, string]> = await Promise.all(
    manifestPaths.map(async (path, index) => [path, await sha256(manifestBytes[index])]),
  );
  const clients: InventoryClient[] = [];
  const operations: InventoryOperation[] = [];
  for (const { rawMetadata, ...plan } of plans) {
    const sourceKinds = ["raw", "normalized", "client"] as const;
    const contents = await Promise.all(
      sourceKinds.map((kind) => Deno.readFile(new URL(plan.sources[kind], rootUrl))),
    );
    const digests = await Promise.all(contents.map(sha256));
    equal(contents[0].byteLength, rawMetadata.bytes, `${plan.id} raw byte length`);
    equal(digests[0], rawMetadata.sha256, `${plan.id} raw SHA-256`);
    const sourceHashes: InventorySources = {
      raw: digests[0],
      normalized: digests[1],
      client: digests[2],
    };
    sourceKinds.forEach((kind) => hashes.push([plan.sources[kind], sourceHashes[kind]]));
    const document = parseOpenApiDocument(decoder.decode(contents[1]), plan.sources.normalized);
    const models = collectOperations(document);
    const descriptors = describeClientOperations(document, lockedNames.providers[plan.provider]);
    const byKey = new Map(descriptors.map((descriptor) => [
      `${descriptor.source.collection}:${descriptor.method.toLowerCase()}:${descriptor.source.path}`,
      descriptor,
    ]));
    sameSet(models.map((operation) => operation.key), [...byKey.keys()], `${plan.id} descriptors`);
    const methodNames = descriptors.map((descriptor) => descriptor.methodName);
    const methodLines = clientMethodLines(decoder.decode(contents[2]), plan.className);
    sameSet(methodNames, [...methodLines.keys()], `${plan.id} source method declarations`);
    // Hash-qualified imports prevent stale module-cache parity checks after a source change.
    const moduleUrl = new URL(plan.sources.client, rootUrl);
    moduleUrl.searchParams.set("inventory-sha256", sourceHashes.client.slice("sha256:".length));
    const exports: Record<string, unknown> = await import(moduleUrl.href);
    const registry = record(exports[plan.registryName], `${plan.id} exported operation registry`);
    sameSet(methodNames, Object.keys(registry), `${plan.id} exported registry methods`);
    const constructor = exports[plan.className];
    if (typeof constructor !== "function") throw new Error(`${plan.id} missing ${plan.className}`);
    const prototype = record(constructor.prototype, `${plan.id} client prototype`);
    const prototypeNames = Object.getOwnPropertyNames(prototype).filter((name) =>
      name !== "constructor"
    );
    sameSet(methodNames, prototypeNames, `${plan.id} prototype methods`);
    for (const name of prototypeNames) {
      if (typeof Object.getOwnPropertyDescriptor(prototype, name)?.value !== "function") {
        throw new Error(`${plan.id} prototype member ${name} is not a method`);
      }
    }
    clients.push({ ...plan, operationCount: models.length, sourceHashes });
    for (const model of models) {
      const descriptor = byKey.get(model.key)!;
      const native = record(registry[descriptor.methodName], `${plan.id} ${descriptor.methodName}`);
      equal(native.id, model.operationId, `${plan.id} ${descriptor.methodName} operationId`);
      equal(native.method, model.method, `${plan.id} ${descriptor.methodName} HTTP method`);
      equal(native.path, model.path, `${plan.id} ${descriptor.methodName} HTTP path`);
      equal(
        JSON.stringify(native.pathGroups ?? []),
        JSON.stringify(model.pathGroups),
        `${plan.id} ${descriptor.methodName} optional path groups`,
      );
      const pointerPath = descriptor.source.path.replaceAll("~", "~0").replaceAll("/", "~1");
      operations.push({
        ...model,
        id: `${plan.id}::${model.key}`,
        clientId: plan.id,
        provider: plan.provider,
        version: plan.version,
        operationKey: model.key,
        methodName: descriptor.methodName,
        className: plan.className,
        source: {
          ...descriptor.source,
          pointer: `/${descriptor.source.collection}/${pointerPath}/${model.method.toLowerCase()}`,
          normalized: plan.sources.normalized,
          client: plan.sources.client,
          clientLine: methodLines.get(descriptor.methodName)!,
        },
      });
    }
  }
  hashes.sort(([a], [b]) => compareText(a, b));
  return {
    schemaVersion: 1,
    sourceFingerprint: await sha256(encoder.encode(JSON.stringify(hashes))),
    providers,
    clients,
    operations,
  };
}

function clientMethodLines(source: string, className: string): Map<string, number> {
  const lines = source.split("\n");
  const classStart = lines.findIndex((line) => line === `export class ${className} {`);
  if (classStart < 0) throw new Error(`Missing generated class declaration ${className}`);
  const methods = new Map<string, number>();
  for (let index = classStart + 1; index < lines.length && lines[index] !== "}"; index++) {
    const match = /^ {2}([A-Za-z_$][\w$]*)\(/.exec(lines[index]);
    if (match === null || match[1] === "constructor") continue;
    if (methods.has(match[1])) throw new Error(`Duplicate ${className}.${match[1]} declaration`);
    methods.set(match[1], index + 1);
  }
  return methods;
}

function compareProviders(a: string, b: string): number {
  const rank = (id: string) => {
    const index = providerOrder.indexOf(id);
    return index < 0 ? providerOrder.length : index;
  };
  return rank(a) - rank(b) || compareText(a, b);
}

function record(value: unknown, label: string): Record<string, unknown> {
  const object = asObject(value);
  if (object === undefined) throw new Error(`Invalid ${label}: expected object`);
  return object;
}

function nonempty(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Invalid ${label}`);
}

function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) {
    throw new Error(
      `${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function sameSet(expected: string[], actual: string[], label: string): void {
  if (new Set(expected).size !== expected.length || new Set(actual).size !== actual.length) {
    throw new Error(`${label} contains duplicate identities`);
  }
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter((value) => !actualSet.has(value)).sort(compareText);
  const unexpected = actual.filter((value) => !expectedSet.has(value)).sort(compareText);
  if (missing.length || unexpected.length) {
    throw new Error(
      `${label} mismatch: missing=[${missing.join(", ")}], unexpected=[${unexpected.join(", ")}]`,
    );
  }
}

function sourcePath(path: string, prefix: string): string {
  if (
    !path.startsWith(prefix) || path.includes("\\") || path.split("/").some((part) => part === "..")
  ) {
    throw new Error(`Invalid source path ${path}; expected a local path under ${prefix}`);
  }
  return path;
}

async function discover(
  root: URL,
  directory: string,
  include: (path: string) => boolean,
): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(new URL(directory, root))) {
    const path = `${directory}${entry.name}`;
    if (entry.isDirectory && entry.name !== "tests") {
      files.push(...await discover(root, `${path}/`, include));
    } else if (entry.isFile && include(path)) files.push(path);
  }
  return files.sort(compareText);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return `sha256:${
    Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")
  }`;
}

async function main(): Promise<void> {
  const args = Deno.args;
  if (args.includes("--help")) {
    console.log(
      "Usage: deno run --allow-read --allow-write inventory.ts --out FILE [--root PROJECT]\nWrites a new inventory file; never calls APIs or regenerates clients.",
    );
    return;
  }
  let out: string | undefined;
  let root: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    if (flag === "--out" && out === undefined) out = value;
    else if (flag === "--root" && root === undefined) root = value;
    else throw new Error(`Unknown or repeated argument ${flag}`);
  }
  if (out === undefined) throw new Error("--out FILE is required; use --help for usage");
  const outputPath = resolve(out);
  const inventory = await buildInventory(root);
  // A new output avoids overwriting evidence or accidentally replacing a source file.
  await Deno.mkdir(dirname(outputPath), { recursive: true });
  await Deno.writeTextFile(outputPath, `${JSON.stringify(inventory, null, 2)}\n`, {
    createNew: true,
  });
  console.log(
    `Inventoried ${inventory.operations.length} operations across ${inventory.clients.length} clients: ${
      relative(Deno.cwd(), outputPath)
    }`,
  );
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    Deno.exitCode = 1;
  }
}
