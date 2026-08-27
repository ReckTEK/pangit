import {
  expectedRestClientProviders,
  type ProviderPublicNames,
  renderProviderClient,
  type RestClientPublicNamesManifest,
} from "./generate.ts";
import { parseOpenApiDocument } from "./openapi.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("./public-names.json", import.meta.url)),
) as RestClientPublicNamesManifest;

Deno.test("reviewed public names exactly cover current generated methods and types", async () => {
  assertEquals(manifest.version, 1);
  assertEquals(Object.keys(manifest.providers).toSorted(), expectedRestClientProviders);

  for (const provider of expectedRestClientProviders) {
    const document = parseOpenApiDocument(
      await Deno.readTextFile(new URL(`../specs/normalized/${provider}.json`, import.meta.url)),
      provider,
    );
    let captured: ProviderPublicNames | undefined;
    renderProviderClient(provider, document, {
      lockedNames: manifest.providers[provider],
      captureNames: (names) => captured = names,
    });
    assertEquals(captured, manifest.providers[provider]);

    for (
      const names of [
        Object.values(manifest.providers[provider].methods),
        Object.values(manifest.providers[provider].symbols),
      ]
    ) {
      assertEquals(new Set(names.map((name) => name.toLowerCase())).size, names.length);
    }
  }
});

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
