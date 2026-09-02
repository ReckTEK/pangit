import {
  applyOpenApiTransform,
  assertOpenApiDocument,
  downloadOpenApiSpecifications,
  type GeneratedOpenApiManifest,
  reuseDownloadedOpenApiSpecifications,
  sha256,
} from "./download-openapi-specifications.ts";
import { workspace } from "../../../workspace-layout.ts";

Deno.test("Gitea release templates become concrete specifications", () => {
  const transformed = applyOpenApiTransform(
    '{"swagger":"2.0","version":"{{.SwaggerAppVer}}","basePath":"{{.SwaggerAppSubUrl}}/api/v1"}',
    { url: "https://example.invalid/spec", transform: "gitea-template" },
    "1.26.4",
  );
  const expected = '{"swagger":"2.0","version":"1.26.4","basePath":"/api/v1"}';
  if (transformed !== expected) {
    throw new Error(`Expected ${expected}, received ${transformed}`);
  }
  assertOpenApiDocument(transformed, "json", "test Gitea specification");
});

Deno.test("unresolved source templates are rejected", () => {
  try {
    applyOpenApiTransform(
      '{"openapi":"3.0.0","title":"{{.Unknown}}"}',
      { url: "https://example.invalid/spec", transform: "gitea-template" },
      "latest",
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("unresolved template")) return;
    throw error;
  }
  throw new Error("Expected unresolved template expression to be rejected");
});

Deno.test("raw specification hashes use SHA-256", async () => {
  const actual = await sha256("abc");
  const expected = "sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, received ${actual}`);
  }
});

Deno.test("cached specs rebuild the manifest deterministically and invalid input preserves it", async () => {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".raw-test-" });
  const root = new URL(`${directory}/`, workspace.root);
  const manifestFile = new URL("generated-manifest.json", root);
  try {
    await downloadOpenApiSpecifications(
      () => Promise.resolve(Response.json({ openapi: "3.0.3" })),
      root,
    );
    const previous = await Deno.readTextFile(manifestFile);
    await reuseDownloadedOpenApiSpecifications(root);
    if (await Deno.readTextFile(manifestFile) !== previous) {
      throw new Error("Cached generation changed the source manifest");
    }
    const manifest: GeneratedOpenApiManifest = JSON.parse(previous);
    for (const [gitHost, hostManifest] of Object.entries(manifest.gitHosts)) {
      for (const [version, release] of Object.entries(hostManifest.versions)) {
        assertEqual(
          release.artifacts.client,
          `src/generated-rest-clients/${gitHost}/${version}/mod.ts`,
        );
        if (
          "tests" in release.artifacts || "results" in release.artifacts ||
          "compose" in release.artifacts
        ) {
          throw new Error("API specification artifacts still mix in live-E2E paths");
        }
      }
    }
    const release = Object.values(Object.values(manifest.gitHosts)[0].versions)[0];
    const input = new URL(
      release.destination.replace(
        "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/",
        "",
      ),
      root,
    );
    await Deno.writeTextFile(input, "not a specification");
    let rejected = false;
    try {
      await reuseDownloadedOpenApiSpecifications(root);
    } catch {
      rejected = true;
    }
    if (!rejected) throw new Error("Invalid cached specification was accepted");
    if (await Deno.readTextFile(manifestFile) !== previous) {
      throw new Error("Invalid cached input replaced the source manifest");
    }
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

function assertEqual(actual: string, expected: string): void {
  if (actual !== expected) throw new Error(`Expected ${expected}, received ${actual}`);
}
