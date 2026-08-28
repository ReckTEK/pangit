import {
  documentation,
  type DocumentationOperation,
  loadDocumentationOperations,
} from "@mannsion/pangit/documentation";
import { type ExplorerSpec, explorerSpec } from "./explorer.ts";
import { operationHref, scalarConfiguration } from "./scalar.ts";

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const source: ExplorerSpec = {
  openapi: "3.0.3",
  info: { title: "Fixture", version: "1.0" },
  servers: [{ url: "//api.example.com" }],
  tags: [{ name: "Items" }, { name: "Unrelated" }],
  components: { schemas: { Item: { type: "object", properties: { id: { type: "integer" } } } } },
  paths: {
    "/items": {
      servers: [{ url: "//different.example.com" }],
      get: {
        operationId: "items/list",
        servers: [{ url: "//operation.example.com" }],
        responses: { "200": { description: "List" } },
      },
    },
  },
  "x-ms-paths": {
    "/items?name={name}": {
      servers: [{ url: "//variants.example.com" }],
      get: {
        operationId: "getSelectedItem",
        tags: ["Items"],
        parameters: [{ in: "query", name: "name", required: true }],
        responses: { "200": { description: "Selected item" } },
      },
    },
  },
};

Deno.test("explorer resolves protocol-relative URLs without changing server scope or the canonical spec", () => {
  const before = JSON.stringify(source);
  const normal = explorerSpec(source);
  assert(
    normal.servers?.[0].url === "https://api.example.com",
    "Protocol-relative server not normalized",
  );
  const item = normal.paths["/items"];
  assert(
    (item.servers as { url: string }[])[0].url === "https://different.example.com",
    "Path server changed scope",
  );
  assert(
    ((item.get as Record<string, unknown>).servers as { url: string }[])[0].url ===
      "https://operation.example.com",
    "Operation server changed scope",
  );
  for (const object of [normal, item, item.get as Record<string, unknown>]) {
    const servers = object.servers as { url: string }[];
    assert(
      servers.length === 2 && servers[1].url === "{apiServer}",
      "Custom server missing at a scope",
    );
  }
  assert(
    JSON.stringify(normal.components) === JSON.stringify(source.components),
    "Schemas changed",
  );
  assert(JSON.stringify(source) === before, "Canonical specification mutated");
});

Deno.test("self-hosted references offer a native server variable before the relative upstream URL", () => {
  const view = explorerSpec({ ...source, servers: [{ url: "/api/v1" }] });
  assert(
    view.servers?.[0].url === "{apiServer}",
    "Self-hosted reference defaults to the docs host",
  );
  assert(view.servers[1].url === "/api/v1", "Upstream server declaration was removed");
  const missing = explorerSpec({ openapi: "3.0.3", paths: {} });
  assert(missing.servers?.[0].url === "{apiServer}", "Missing server cannot be configured");
});

Deno.test("query-selected variants keep their own query parameters and response contract", () => {
  const variant = explorerSpec(source, { method: "get", path: "/items?name={name}" });
  const operation = variant.paths["/items"].get as Record<string, unknown>;
  assert(Object.keys(variant.paths).length === 1, "Unrelated operations leaked into variant");
  assert(operation.operationId === "getSelectedItem", "Wrong query-selected operation");
  assert((operation.parameters as { name: string }[])[0].name === "name", "Query parameter lost");
  assert(
    (variant.paths["/items"].servers as { url: string }[])[0].url ===
      "https://variants.example.com",
    "Query-selected path server was lost",
  );
  assert(
    JSON.stringify(variant.tags) === JSON.stringify([{ name: "Items" }]),
    "Unrelated empty tag groups obscured the selected operation",
  );
  assert(
    JSON.stringify(variant.components) === JSON.stringify(source.components),
    "Variant lost component schemas",
  );
});

Deno.test("method links use stable IDs while keeping the upstream ID and schema visible", () => {
  const operation: DocumentationOperation = {
    source: { collection: "paths", path: "/items" },
    method: "GET",
    path: "/items",
    methodName: "listItems",
    operationId: "items/list",
    tags: ["Items"],
  };
  const spec = explorerSpec(source, undefined, [operation]);
  const rendered = spec.paths["/items"].get as Record<string, unknown>;
  assert(
    rendered.operationId === "listItems",
    "Slash-containing operation ID still breaks navigation",
  );
  assert(rendered["x-pangit-upstream-operation-id"] === "items/list", "Upstream ID lost");
  assert(String(rendered.description).includes("listItems()"), "PanGit method not documented");
  const withoutId = structuredClone(source);
  delete (withoutId.paths["/items"].get as Record<string, unknown>).operationId;
  const generated = explorerSpec(withoutId, undefined, [operation]);
  assert(
    (generated.paths["/items"].get as Record<string, unknown>).operationId === "listItems",
    "Missing upstream ID broke method links",
  );
});

Deno.test("Scalar never fetches implicit docs-host URLs or invalid API targets", async () => {
  const config = scalarConfiguration(source, "dark", "https://docs.example.com");
  assert(config.customFetch, "Request boundary missing");
  const originalFetch = globalThis.fetch;
  let sent = false;
  globalThis.fetch = () => {
    sent = true;
    return Promise.resolve(new Response());
  };
  try {
    for (
      const input of [
        "",
        "/api/v1",
        "javascript:alert(1)",
        "https://user:secret@example.com",
        new Request("https://docs.example.com/api/v1/items?limit=10"),
      ]
    ) {
      let rejected = false;
      try {
        await config.customFetch(input);
      } catch {
        rejected = true;
      }
      assert(rejected && !sent, "An invalid or implicit server reached fetch");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("Scalar transport preserves the explicit request without browser cookies or a hosted proxy", async () => {
  const originalFetch = globalThis.fetch;
  let sent = false;
  const config = scalarConfiguration(source, "light", "https://docs.example.com");
  assert(config.customFetch, "Direct transport missing");
  const request = new Request("https://api.example.com/items?limit=10", {
    method: "POST",
    headers: { Authorization: "Bearer test-only-token" },
    body: "request-body",
    credentials: "include",
  });
  globalThis.fetch = (input, init) => {
    assert(input === request, "Request URL, body, or explicit headers were replaced");
    assert(init?.credentials === "omit", "Browser cookies could be attached");
    sent = true;
    return Promise.resolve(new Response("response-body", { status: 201 }));
  };
  try {
    const response = await config.customFetch(request, { credentials: "include" });
    assert(
      sent && response.status === 201 && await response.text() === "response-body",
      "Response changed",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("every generated method has a unique Scalar link and retains its native request contract", async () => {
  for (const provider of documentation.providers) {
    for (const version of provider.versions) {
      const operations = await loadDocumentationOperations(provider.id, version.version);
      assert(operations, "Method index missing");
      const original: ExplorerSpec = JSON.parse(
        await Deno.readTextFile(new URL(`../public${version.specUrl}`, import.meta.url)),
      );
      const originalJson = JSON.stringify(original);
      const view = explorerSpec(original, undefined, operations);
      const links = new Set<string>();
      for (const operation of operations) {
        const entry = view[operation.source.collection]?.[operation.source.path]
          ?.[operation.method.toLowerCase()] as Record<string, unknown>;
        const originalEntry = original[operation.source.collection]?.[operation.source.path]
          ?.[operation.method.toLowerCase()] as Record<string, unknown>;
        assert(
          entry?.operationId === operation.methodName,
          `Missing method: ${operation.methodName}`,
        );
        for (const field of ["parameters", "requestBody", "responses", "security"]) {
          assert(
            JSON.stringify(entry[field]) === JSON.stringify(originalEntry[field]),
            `Changed ${field}: ${operation.methodName}`,
          );
        }
        const link = operationHref(version.route, operation);
        assert(
          link.includes(`#tag/`) && link.endsWith(`/${operation.methodName}`),
          "Method link does not target Scalar",
        );
        if (operation.variant) {
          assert(
            link.includes(`?variant=${encodeURIComponent(operation.variant)}`),
            "Variant scope lost",
          );
        }
        links.add(link);
      }
      assert(links.size === version.operationCount, "Missing or duplicate method links");
      assert(
        JSON.stringify(view.components) === JSON.stringify(original.components),
        "Schemas or security schemes changed",
      );
      assert(JSON.stringify(original) === originalJson, "Canonical document changed");
    }
  }
});
