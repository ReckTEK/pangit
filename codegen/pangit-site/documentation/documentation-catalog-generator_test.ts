import { readWorkspace, workspace } from "../../workspace-layout.ts";
import { generateSiteAssets } from "../static-assets.ts";
import { siteConfig } from "@mannsion/pangit-site/config";
import { createSiteUrls } from "@mannsion/pangit-site/urls";
import { generateDocumentation } from "./documentation-catalog-generator.ts";
import {
  documentation,
  type DocumentationOperation,
  loadDocumentationOperations,
} from "@mannsion/pangit-site/documentation";
import { restClientVersions } from "../../../packages/pangit/src/generated-rest-clients/mod.ts";
import {
  type GeneratedOpenApiManifest,
  sha256,
} from "../../pangit/raw-rest-client-generation/openapi-specifications/download-openapi-specifications.ts";

const libraryRoot = workspace.packages.pangit;
const siteRoot = workspace.packages.site;
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

Deno.test("documentation covers every shipped client, exact method allocation, and full specification", async () => {
  const specs: GeneratedOpenApiManifest = JSON.parse(
    await Deno.readTextFile(
      new URL(
        "raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json",
        workspace.codegen.pangit,
      ),
    ),
  );
  assert(
    JSON.stringify(documentation.providers.map((provider) => provider.id).sort()) ===
      JSON.stringify(Object.keys(restClientVersions).sort()),
    "Provider inventories differ",
  );
  for (const provider of documentation.providers) {
    const versions = restClientVersions[provider.id as keyof typeof restClientVersions];
    assert(
      JSON.stringify(provider.versions.map((version) => version.version)) ===
        JSON.stringify(versions),
      `Version inventory differs for ${provider.id}`,
    );
    for (const version of provider.versions) {
      const artifact = specs.gitHosts[provider.id].versions[version.version].artifacts;
      const client = await import(new URL(artifact.client, libraryRoot).href);
      const registry = client[`${provider.client.variablePrefix}Operations`] as Record<
        string,
        { id: string; method: string; path: string }
      >;
      const operations = await loadDocumentationOperations(provider.id, version.version);
      assert(
        operations?.length === Object.keys(registry).length,
        `${provider.id}/${version.version} lost methods`,
      );
      for (const operation of operations) {
        const emitted = registry[operation.methodName];
        assert(
          emitted?.id === operation.operationId && emitted.method === operation.method &&
            emitted.path === operation.path,
          `Incorrect method mapping: ${provider.id}/${version.version}/${operation.methodName}`,
        );
      }
      const normalized = await Deno.readTextFile(new URL(artifact.normalized, workspace.root));
      const published = await Deno.readTextFile(new URL(version.artifacts.openapi, siteRoot));
      assert(
        normalized === published,
        "Documentation altered or truncated the provider specification",
      );
      assert(await sha256(published) === version.sha256, "Documentation checksum differs");
      const document = JSON.parse(published);
      assert(
        version.schemaCount === Object.keys(document.components?.schemas ?? {}).length,
        "Schema count differs",
      );
      for (const variant of version.variants) {
        assert(
          document["x-ms-paths"][variant.path][variant.method],
          "Query variant missing from original document",
        );
        assert(
          operations.some((operation) => operation.variant === variant.id),
          "Query variant is not linked from the method index",
        );
      }
    }
  }
  await generateDocumentation({ check: true });
});

Deno.test("documentation loaders reject unknown client versions", async () => {
  assert(
    await loadDocumentationOperations("gitea", "not-a-version") === undefined,
    "Unknown version resolved",
  );
});

Deno.test("relocated workspace generates documentation and site assets deterministically, preserving outputs on invalid input", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".docs-test-" });
  const fixture = new URL(`file://${Deno.cwd()}/${directory}/`);
  const write = async (path: string, value: unknown) => {
    const target = new URL(path, fixture);
    await Deno.mkdir(new URL("./", target), { recursive: true });
    await Deno.writeTextFile(target, typeof value === "string" ? value : JSON.stringify(value));
  };
  try {
    await write("deno.json", { workspace: ["./components/sdk", "./web/reference"] });
    await write("components/sdk/deno.json", { name: "@mannsion/pangit", version: "0.1.0" });
    await write("web/reference/deno.json", { name: "@mannsion/pangit-site" });
    const paths = await readWorkspace(fixture);
    const site = paths.packages.site;
    const config = {
      ...siteConfig,
      assets: {
        ...siteConfig.assets,
        openapi: "/schemas",
        brand: { source: "docs/images/", path: "/identity", files: ["logo.svg"] },
        logo: "logo.svg",
      },
    };
    const urls = createSiteUrls(config);
    await write("components/sdk/docs/images/logo.svg", "<svg/>");
    await write("codegen/pangit/raw-rest-client-generation/public-names.json", {
      version: 1,
      providers: { fixture: { methods: { "paths:get:/items": "stableItems" }, symbols: {} } },
    });
    await write(
      "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json",
      {
        schemaVersion: 1,
        gitHosts: {
          fixture: {
            name: "Fixture",
            selected: "1.0",
            kind: "release",
            upstream: "https://example.invalid",
            client: {
              className: "FixtureClient",
              displayName: "Fixture",
              namespaceName: "Fixture",
              variablePrefix: "fixture",
            },
            versions: {
              "1.0": {
                source: "https://example.invalid/spec",
                sha256: "source-hash",
                artifacts: {
                  normalized:
                    "codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/fixture/1.0.json",
                  documentation: {
                    openapi: "app/documentation/generated/fixture/1.0/openapi.json",
                    operations: "app/documentation/generated/fixture/1.0/operations.json",
                    route: "/docs/raw/fixture/1.0",
                  },
                },
              },
            },
          },
        },
      },
    );
    await write(
      "codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/fixture/1.0.json",
      {
        openapi: "3.0.3",
        info: { title: "Fixture", version: "1.0" },
        paths: {
          "/items": {
            get: {
              operationId: "renamed-upstream",
              responses: { "200": { description: "Items" } },
            },
          },
        },
        "x-ms-paths": {
          "/items?name={name}": {
            get: {
              operationId: "renamed-upstream",
              parameters: [{ in: "query", name: "name", schema: { type: "string" } }],
              responses: { "200": { description: "Selected item" } },
            },
          },
        },
      },
    );
    await generateDocumentation({ workspace: paths });
    const manifest = new URL("app/documentation/generated/manifest.json", site);
    const previous = await Deno.readTextFile(manifest);
    await generateSiteAssets(paths, config);
    const reference = new URL(`public${urls.spec("fixture", "1.0")}`, paths.packages.site);
    const expected = await Deno.readTextFile(
      new URL(
        "codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/fixture/1.0.json",
        fixture,
      ),
    );
    assert(
      await Deno.readTextFile(reference) === expected,
      "Site used the wrong package or a stale imported catalog",
    );
    assert(
      await Deno.readTextFile(new URL("public/identity/logo.svg", paths.packages.site)) ===
        "<svg/>",
      "Brand path was not configured",
    );
    const operations = JSON.parse(
      await Deno.readTextFile(
        new URL("app/documentation/generated/fixture/1.0/operations.json", site),
      ),
    );
    const main = operations.find((operation: DocumentationOperation) =>
      operation.source.collection === "paths"
    );
    const variant = operations.find((operation: DocumentationOperation) =>
      operation.source.collection === "x-ms-paths"
    );
    assert(main?.methodName === "stableItems", "Locked public name was ignored");
    assert(
      !main.variant && variant?.variant,
      "Duplicate upstream IDs mapped the wrong query variant",
    );
    await generateDocumentation({ workspace: paths, check: true });
    await generateDocumentation({ workspace: paths });
    await generateSiteAssets(paths, config);
    assert(await Deno.readTextFile(manifest) === previous, "Repeat generation changed output");
    assert(
      await Deno.readTextFile(reference) === expected,
      "Repeat site generation changed the spec",
    );
    await write(
      "codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/fixture/1.0.json",
      "invalid JSON",
    );
    let rejected = false;
    try {
      await generateDocumentation({ workspace: paths });
    } catch {
      rejected = true;
    }
    assert(rejected, "Invalid specification was accepted");
    assert(await Deno.readTextFile(manifest) === previous, "Invalid input replaced documentation");
  } finally {
    await Deno.remove(fixture, { recursive: true });
  }
});
