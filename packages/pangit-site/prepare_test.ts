import { documentation } from "@mannsion/pangit/documentation";
import { siteConfig } from "./site.config.ts";
import { siteUrls } from "./app/urls.ts";

const libraryRoot = new URL("../", import.meta.resolve("@mannsion/pangit/documentation"));

Deno.test("prepared references are exact copies of package assets for every provider and version", async () => {
  for (const provider of documentation.providers) {
    for (const version of provider.versions) {
      for (
        const [artifact, url] of [
          [version.artifacts.openapi, siteUrls.spec(provider.id, version.version)],
          [version.artifacts.operations, siteUrls.operations(provider.id, version.version)],
        ]
      ) {
        const expected = await Deno.readTextFile(new URL(artifact, libraryRoot));
        const actual = await Deno.readTextFile(new URL(`./public${url}`, import.meta.url));
        if (expected !== actual) {
          throw new Error(
            `Prepared reference differs: ${provider.id}/${version.version}/${artifact}`,
          );
        }
      }
    }
  }
});

Deno.test("configured snippets point to nonempty standalone source files", async () => {
  for (const file of Object.values(siteConfig.snippets)) {
    const source = await Deno.readTextFile(new URL(`./app/snippets/${file}`, import.meta.url));
    if (!source.trim()) throw new Error(`Empty code snippet: ${file}`);
  }
});
