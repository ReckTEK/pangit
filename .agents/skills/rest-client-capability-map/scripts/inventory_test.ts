import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type {
  ProviderNames,
  ProviderPublicNames,
} from "../../../../codegen/generator/client-manifests.ts";
import type { OpenApiDocument } from "../../../../codegen/generator/openapi.ts";
import { renderProviderClient } from "../../../../codegen/generator/render.ts";
import { buildInventory } from "./inventory.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function rejects(action: () => Promise<unknown>, message: string): Promise<void> {
  try {
    await action();
  } catch (error) {
    assert(
      error instanceof Error && error.message.includes(message),
      `Expected ${message}; got ${error}`,
    );
    return;
  }
  throw new Error(`Expected failure containing ${message}`);
}

function operation(operationId: string): Record<string, unknown> {
  return {
    operationId,
    summary: "Read a provider-native resource",
    description: "A detailed upstream operation description.",
    tags: ["resources"],
    responses: {
      "200": {
        description: "Resource",
        content: { "application/json": { schema: { type: "object" } } },
      },
    },
  };
}

function document(paths: OpenApiDocument["paths"]): OpenApiDocument {
  return { openapi: "3.0.3", info: { title: "Inventory fixture", version: "1" }, paths };
}

async function digest(source: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)),
  );
  return `sha256:${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function write(root: URL, path: string, source: string): Promise<void> {
  const url = new URL(path, root);
  await Deno.mkdir(dirname(fileURLToPath(url)), { recursive: true });
  await Deno.writeTextFile(url, source);
}

async function fixture(): Promise<{
  root: URL;
  documents: Record<string, Record<string, OpenApiDocument>>;
  locked: Record<string, ProviderPublicNames>;
}> {
  const root = pathToFileURL(`${await Deno.makeTempDir({ prefix: "rest-inventory-" })}/`);
  const getResource = {
    ...operation("getOAuth2"),
    deprecated: true,
    externalDocs: { url: "https://example.invalid/contract" },
    security: [{ token: ["read"] }],
    servers: [{ url: "https://example.invalid/resource" }],
    parameters: [{ in: "query", name: "page", schema: { type: "integer", default: 1 } }],
  };
  const azure = document({ "/repos/~root/{id}": { get: operation("repository_get") } });
  azure["x-ms-paths"] = {
    "/repos/~root/{id}?includeHidden={includeHidden}": {
      get: {
        ...operation("repository_getHidden"),
        parameters: [{ in: "query", name: "includeHidden", schema: { type: "boolean" } }],
      },
    },
  };
  // Deliberately unsorted providers and versions exercise discovery order, not insertion order.
  const documents: Record<string, Record<string, OpenApiDocument>> = {
    "azure-devops": { latest: azure },
    gitlab: {
      latest: document({
        "/projects/{id}/repository/files/*file_path(/raw)": { get: operation("files_get") },
      }),
    },
    gitea: {
      "1.0.0": document({
        "/repos/{id}": { get: getResource },
        "/old-only": { get: operation("then") },
      }),
      "2.0.0": document({
        "/repos/{id}": { get: getResource },
        "/users/{id}": { get: operation("getOauth2") },
        "/repos/{id}/files": {
          post: {
            ...operation("createFile"),
            requestBody: {
              required: true,
              description: "Native request content",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["content"],
                    properties: { content: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      }),
    },
  };
  const config: Record<string, unknown> = {};
  const providers: Record<string, unknown> = {};
  const locked: Record<string, ProviderPublicNames> = {};
  for (const [provider, versions] of Object.entries(documents)) {
    const selected = provider === "gitea" ? "2.0.0" : "latest";
    const prefix = provider.replaceAll("-", "");
    const names: ProviderNames = {
      className: `${prefix}RestClient`,
      displayName: provider,
      namespaceName: `${prefix}Api`,
      variablePrefix: prefix,
    };
    renderProviderClient(provider, versions[selected], {
      names,
      captureNames: (value) => locked[provider] = value,
    });
    const configuredVersions: Record<string, unknown> = {};
    const rawVersions: Record<string, unknown> = {};
    const common = {
      name: provider,
      kind: "live",
      upstream: `https://example.invalid/${provider}`,
      selected,
      client: names,
    };
    for (const [version, schema] of Object.entries(versions)) {
      const source = JSON.stringify(schema);
      const raw = `codegen/specs/raw/${provider}/${version}.json`;
      const normalized = `codegen/specs/normalized/${provider}/${version}.json`;
      const client = `src/generated/${provider}/${version}/client.ts`;
      const url = `https://example.invalid/${provider}/${version}.json`;
      configuredVersions[version] = { url };
      rawVersions[version] = {
        destination: raw,
        bytes: new TextEncoder().encode(source).byteLength,
        sha256: await digest(source),
        source: url,
        format: "json",
        artifacts: { normalized, client, tests: `src/generated/${provider}/${version}/tests` },
      };
      await write(root, raw, source);
      await write(root, normalized, source);
      await write(
        root,
        `packages/pangit/${client}`,
        renderProviderClient(provider, schema, {
          names,
          lockedNames: locked[provider],
          restModulePath: new URL(
            "../../../../packages/pangit/src/rest/mod.ts",
            import.meta.url,
          ).href,
        }),
      );
    }
    config[provider] = { ...common, format: "json", versions: configuredVersions };
    providers[provider] = { ...common, versions: rawVersions };
  }
  await write(root, "codegen/specs/providers.json", JSON.stringify(config));
  await write(
    root,
    "codegen/specs/raw/manifest.json",
    JSON.stringify({ schemaVersion: 1, providers }),
  );
  await write(
    root,
    "codegen/generator/public-names.json",
    JSON.stringify({ version: 1, providers: locked }),
  );
  return { root, documents, locked };
}

Deno.test("inventory retains exact names, historical fallback, Azure identities, and native contracts", async () => {
  const { root, documents, locked } = await fixture();
  try {
    const inventory = await buildInventory(root);
    assert(
      inventory.providers.map((provider) => provider.id).join() === "gitea,gitlab,azure-devops",
      "Gitea-first provider order",
    );
    assert(
      inventory.clients[0].id === "gitea@2.0.0" && inventory.clients[1].id === "gitea@1.0.0",
      "Selected Gitea version must lead its historical versions",
    );
    const oldOnly = inventory.operations.find((value) =>
      value.operationKey === "paths:get:/old-only"
    );
    assert(
      oldOnly !== undefined && !Object.hasOwn(locked.gitea.methods, oldOnly.operationKey),
      "Historical operations absent from selected name locks must survive",
    );
    assert(oldOnly.methodName !== "then", "Reserved method names must use the generator fallback");
    const current = inventory.operations.filter((value) => value.clientId === "gitea@2.0.0");
    for (const value of current) {
      assert(
        value.methodName === locked.gitea.methods[value.operationKey],
        "Reviewed method spelling must remain exact",
      );
    }
    assert(
      new Set(current.map((value) => value.methodName)).size === current.length,
      "Case-colliding operation IDs must remain distinct",
    );
    const azure = inventory.operations.filter((value) => value.provider === "azure-devops");
    assert(
      azure.length === 2 && azure[0].path === azure[1].path && azure[0].id !== azure[1].id,
      "Azure paths and query-qualified x-ms-paths must not collapse",
    );
    assert(
      azure.some((value) =>
        value.source.pointer.includes("~0root") && value.source.pointer.includes("?includeHidden=")
      ),
      "JSON Pointer must escape tilde and retain query qualifiers",
    );
    const gitlab = inventory.operations.find((value) => value.provider === "gitlab")!;
    assert(
      gitlab.pathGroups.length === 1 &&
        gitlab.parameters.some((value) => value.name === "file_path" && value.multiSegment),
      "GitLab optional groups and wildcard serialization must survive",
    );
    const resource = current.find((value) => value.operationId === "getOAuth2")!;
    assert(
      resource.deprecated && resource.externalDocs === "https://example.invalid/contract" &&
        resource.server === "https://example.invalid/resource" &&
        resource.security?.[0].token[0] === "read",
      "Native operation metadata must survive",
    );
    assert(
      resource.parameters.some((value) => value.name === "page" && value.location === "query") &&
        resource.responses[0].content[0].mediaType === "application/json",
      "Parameter and response contracts must survive",
    );
    assert(
      current.some((value) =>
        value.body?.required && value.body.description === "Native request content"
      ),
      "Request bodies must be included",
    );
    for (const value of inventory.operations) {
      let pointed: unknown = documents[value.provider][value.version];
      for (const token of value.source.pointer.slice(1).split("/")) {
        pointed =
          (pointed as Record<string, unknown>)[token.replaceAll("~1", "/").replaceAll("~0", "~")];
      }
      assert(
        (pointed as Record<string, unknown>).operationId === value.operationId,
        "Every source pointer must resolve to its original operation",
      );
      const source = await Deno.readTextFile(new URL(value.source.client, root));
      assert(
        source.split("\n")[value.source.clientLine - 1].startsWith(`  ${value.methodName}(`),
        "Client line must point to the exact method declaration",
      );
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("inventory is deterministic, fingerprints exact bytes, and rejects changed raw snapshots", async () => {
  const { root } = await fixture();
  try {
    const first = await buildInventory(root);
    const second = await buildInventory(root);
    assert(
      JSON.stringify(first) === JSON.stringify(second),
      "Unchanged sources must produce byte-identical JSON",
    );
    assert(
      /^sha256:[a-f0-9]{64}$/.test(first.sourceFingerprint),
      "Fingerprint must identify SHA-256",
    );
    const raw = new URL(first.clients[0].sources.raw, root);
    const updated = `${await Deno.readTextFile(raw)}\n`;
    await Deno.writeTextFile(raw, updated);
    await rejects(() => buildInventory(root), "raw byte length mismatch");
    const manifestUrl = new URL("codegen/specs/raw/manifest.json", root);
    const manifest = JSON.parse(await Deno.readTextFile(manifestUrl));
    const entry = manifest.providers.gitea.versions["2.0.0"];
    entry.bytes = new TextEncoder().encode(updated).byteLength;
    await Deno.writeTextFile(manifestUrl, JSON.stringify(manifest));
    await rejects(() => buildInventory(root), "raw SHA-256 mismatch");
    entry.sha256 = await digest(updated);
    await Deno.writeTextFile(manifestUrl, JSON.stringify(manifest));
    const third = await buildInventory(root);
    assert(
      third.sourceFingerprint !== first.sourceFingerprint,
      "Even semantically equivalent source byte changes must invalidate the fingerprint",
    );
    assert(
      JSON.stringify(third.operations) === JSON.stringify(first.operations),
      "Raw whitespace must not invent semantic changes",
    );
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("inventory rejects manifest/tree drift and refreshed imported registry drift", async () => {
  const { root } = await fixture();
  try {
    const initial = await buildInventory(root);
    const extra = "codegen/specs/normalized/gitea/unlisted.json";
    await write(root, extra, "{}");
    await rejects(() => buildInventory(root), "normalized source files mismatch");
    await Deno.remove(new URL(extra, root));
    const configUrl = new URL("codegen/specs/providers.json", root);
    const configSource = await Deno.readTextFile(configUrl);
    const config = JSON.parse(configSource);
    delete config.gitea.versions["1.0.0"];
    await Deno.writeTextFile(configUrl, JSON.stringify(config));
    await rejects(() => buildInventory(root), "gitea versions mismatch");
    await Deno.writeTextFile(configUrl, configSource);
    const clientUrl = new URL(initial.clients[0].sources.client, root);
    const original = await Deno.readTextFile(clientUrl);
    await Deno.remove(clientUrl);
    await rejects(() => buildInventory(root), "generated client files mismatch");
    await Deno.writeTextFile(clientUrl, original.replace('method: "GET"', 'method: "POST"'));
    await rejects(() => buildInventory(root), "HTTP method mismatch");
    const methodName = initial.operations.find((operation) =>
      operation.clientId === initial.clients[0].id
    )!.methodName;
    await Deno.writeTextFile(
      clientUrl,
      original.replace(`${methodName}: {`, "unexpectedInventoryEntry: {"),
    );
    await rejects(() => buildInventory(root), "exported registry methods mismatch");
    await Deno.writeTextFile(
      clientUrl,
      `${original}\nObject.defineProperty(${
        initial.clients[0].className
      }.prototype, "unexpectedMember", { value() {} });\n`,
    );
    await rejects(() => buildInventory(root), "prototype methods mismatch");
    await Deno.writeTextFile(
      clientUrl,
      original.replace(
        "this.rest = options instanceof RestClient ? options : new RestClient(options);",
        'throw new Error("Client construction is forbidden during inventory");',
      ),
    );
    await buildInventory(root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("checked-in inventory reconciles every provider/version and is deterministic without API calls", async () => {
  const first = await buildInventory();
  const second = await buildInventory();
  assert(
    JSON.stringify(first) === JSON.stringify(second),
    "Checked-in inventory must be deterministic",
  );
  assert(
    first.providers[0].id === "gitea" && first.clients[0].selected,
    "Gitea selected version must be the first anchor",
  );
  assert(
    first.operations.length > 0 &&
      new Set(first.operations.map((operation) => operation.id)).size === first.operations.length,
    "Every operation must have a unique version-qualified identity",
  );
  assert(
    first.clients.reduce((count, client) => count + client.operationCount, 0) ===
      first.operations.length,
    "Per-client counts must reconcile with the full inventory",
  );
});
