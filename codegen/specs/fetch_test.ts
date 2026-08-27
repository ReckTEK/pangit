import { applyApiSpecTransform, assertApiSpecDocument, sha256 } from "./fetch.ts";

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
