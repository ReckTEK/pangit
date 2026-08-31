import type { RestClientSpecManifest } from "./client-manifests.ts";
import { renderPackageConfigurationWithProviderClientExports } from "./provider-client-package-exports.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

Deno.test("provider-client export generation replaces legacy paths and omits runtime internals", () => {
  const manifest = {
    schemaVersion: 1,
    providers: {
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
            destination: "gitea.json",
            artifacts: {
              client: "src/providers/gitea/1.27.2/mod.ts",
              normalized: "codegen/pangit/specs/normalized/gitea/1.27.2.json",
              tests: "tests/providers/gitea/1.27.2",
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
          "./api": "./src/api/mod.ts",
          "./raw": "./src/raw/mod.ts",
          "./raw/gitea/1.27.2": "./src/providers/gitea/1.27.2/mod.ts",
          "./providers": "./src/providers/mod.ts",
          "./providers/gitea/1.27.2": "./src/providers/gitea/1.27.2/mod.ts",
          "./providers/runtime": "./src/providers/runtime/mod.ts",
        },
      },
      null,
      2,
    )
  }\n`;
  const rendered = renderPackageConfigurationWithProviderClientExports(source, manifest, "fixture");
  assertEquals(JSON.parse(rendered).exports, {
    ".": "./src/mod.ts",
    "./api": "./src/api/mod.ts",
    "./providers/gitea/1.27.2": "./src/providers/gitea/1.27.2/mod.ts",
  });
  assertEquals(
    renderPackageConfigurationWithProviderClientExports(rendered, manifest, "fixture"),
    rendered,
  );
});
