import {
  applyApiSpecTransform,
  assertApiSpecDocument,
  fetchApiSpecs,
  type RawSpecManifest,
  reuseApiSpecs,
  sha256,
} from "./fetch.ts";
import { workspace } from "../../workspace-layout.ts";

Deno.test("Gitea release templates become concrete specifications", () => {
  const transformed = applyApiSpecTransform(
    '{"swagger":"2.0","version":"{{.SwaggerAppVer}}","basePath":"{{.SwaggerAppSubUrl}}/api/v1"}',
    { url: "https://example.invalid/spec", transform: "gitea-template" },
    "1.26.4",
  );
  const expected = '{"swagger":"2.0","version":"1.26.4","basePath":"/api/v1"}';
  if (transformed !== expected) {
    throw new Error(`Expected ${expected}, received ${transformed}`);
  }
  assertApiSpecDocument(transformed, "json", "test Gitea specification");
});

Deno.test("unresolved source templates are rejected", () => {
  try {
    applyApiSpecTransform(
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
  const manifestFile = new URL("manifest.json", root);
  try {
    await fetchApiSpecs(() => Promise.resolve(Response.json({ openapi: "3.0.3" })), root);
    const previous = await Deno.readTextFile(manifestFile);
    await reuseApiSpecs(root);
    if (await Deno.readTextFile(manifestFile) !== previous) {
      throw new Error("Cached generation changed the source manifest");
    }
    const manifest: RawSpecManifest = JSON.parse(previous);
    for (const [provider, providerManifest] of Object.entries(manifest.providers)) {
      for (const [version, release] of Object.entries(providerManifest.versions)) {
        const expectedPrefix = `tests/providers/${provider}/${version}`;
        assertEqual(
          release.artifacts.client,
          `src/providers/${provider}/${version}/mod.ts`,
        );
        assertEqual(release.artifacts.tests, expectedPrefix);
        assertEqual(release.artifacts.results, `${expectedPrefix}/results`);
        assertEqual(release.artifacts.compose, `${expectedPrefix}/compose.yaml`);
      }
    }
    const release = Object.values(Object.values(manifest.providers)[0].versions)[0];
    const input = new URL(release.destination.replace("codegen/pangit/specs/raw/", ""), root);
    await Deno.writeTextFile(input, "not a specification");
    let rejected = false;
    try {
      await reuseApiSpecs(root);
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
