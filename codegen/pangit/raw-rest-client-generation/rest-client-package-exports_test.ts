import type { RestClientSpecManifest } from "./rest-client-manifests.ts";
import { renderPackageConfigurationWithProviderClientExports } from "./rest-client-package-exports.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

Deno.test("provider-client export generation replaces legacy paths and omits runtime internals", () => {
  const manifest = {
    schemaVersion: 1,
    gitHosts: {
      gitea: {
        selected: "1.27.2",
        client: {
          className: "GiteaRestClient",
          displayName: "Gitea",
          namespaceName: "GiteaApi",
          variablePrefix: "gitea",
        },
        versions: {
          "1.27.2": {
            source: "https://example.invalid/gitea.json",
            destination: "gitea.json",
            bytes: 1,
            sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            license: {
              spdx: "MIT",
              attribution: "Example",
              declaration: null,
              text: {
                source: "https://example.invalid/LICENSE",
                destination:
                  "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/licenses/gitea/1.27.2/LICENSE",
                bytes: 1,
                sha256: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
              },
              notices: [],
            },
            artifacts: {
              client: "src/generated-rest-clients/gitea/1.27.2/mod.ts",
              normalized:
                "codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/gitea/1.27.2.json",
            },
          },
        },
      },
    },
  } satisfies RestClientSpecManifest;
  const source = `${
    JSON.stringify(
      {
        name: "@mannsion/pangit",
        exports: {
          ".": "./src/mod.ts",
          "./api": "./src/fluent-api/mod.ts",
          "./raw": "./src/raw/mod.ts",
          "./raw/gitea/1.27.2": "./src/generated-rest-clients/gitea/1.27.2/mod.ts",
          "./providers": "./src/generated-rest-clients/mod.ts",
          "./providers/gitea/1.27.2": "./src/generated-rest-clients/gitea/1.27.2/mod.ts",
          "./providers/runtime": "./src/generated-rest-clients/runtime/mod.ts",
        },
      },
      null,
      2,
    )
  }\n`;
  const rendered = renderPackageConfigurationWithProviderClientExports(source, manifest, "fixture");
  assertEquals(JSON.parse(rendered).exports, {
    ".": "./src/mod.ts",
    "./api": "./src/fluent-api/mod.ts",
    "./providers/gitea/1.27.2": "./src/generated-rest-clients/gitea/1.27.2/mod.ts",
  });
  assertEquals(
    renderPackageConfigurationWithProviderClientExports(rendered, manifest, "fixture"),
    rendered,
  );
});
