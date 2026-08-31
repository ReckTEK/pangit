import { documentation } from "./app/documentation/mod.ts";
import { siteConfig } from "./site.config.ts";
import { siteUrls } from "./app/urls.ts";

const siteRoot = new URL("./", import.meta.url);

Deno.test("prepared references are exact copies of package assets for every provider and version", async () => {
  for (const provider of documentation.providers) {
    for (const version of provider.versions) {
      for (
        const [artifact, url] of [
          [version.artifacts.openapi, siteUrls.spec(provider.id, version.version)],
          [version.artifacts.operations, siteUrls.operations(provider.id, version.version)],
        ]
      ) {
        const expected = await Deno.readTextFile(new URL(artifact, siteRoot));
        const actual = await Deno.readTextFile(new URL(`./public${url}`, import.meta.url));
        if (expected !== actual) {
          throw new Error(
            `Prepared reference differs: ${provider.id}/${version.version}/${artifact}`,
          );
        }
      }
    }
  }

  const brandDirectory = new URL(`./public${siteConfig.assets.brand.path}/`, import.meta.url);
  const actualBrandFiles: string[] = [];
  for await (const entry of Deno.readDir(brandDirectory)) {
    if (!entry.isFile) throw new Error(`Unexpected brand directory: ${entry.name}`);
    actualBrandFiles.push(entry.name);
  }
  const expectedBrandFiles = [...siteConfig.assets.brand.files].toSorted();
  if (JSON.stringify(actualBrandFiles.toSorted()) !== JSON.stringify(expectedBrandFiles)) {
    throw new Error("Prepared brand asset inventory differs from site configuration");
  }
  for (const file of expectedBrandFiles) {
    const expected = await Deno.readFile(
      new URL(`../pangit/${siteConfig.assets.brand.source}${file}`, siteRoot),
    );
    const actual = await Deno.readFile(new URL(file, brandDirectory));
    if (
      expected.length !== actual.length || expected.some((byte, index) => byte !== actual[index])
    ) {
      throw new Error(`Prepared brand asset differs: ${file}`);
    }
  }
});

Deno.test("configured snippets point to nonempty standalone source files", async () => {
  for (const file of Object.values(siteConfig.snippets)) {
    const source = await Deno.readTextFile(new URL(`./app/snippets/${file}`, import.meta.url));
    if (!source.trim()) throw new Error(`Empty code snippet: ${file}`);
  }
});
