import type { DocumentationManifest } from "@recktek/pangit-site/documentation";
import { type SiteConfig, siteConfig } from "@recktek/pangit-site/config";
import { createSiteUrls } from "@recktek/pangit-site/urls";
import { workspace, type WorkspacePaths } from "../workspace-layout.ts";

export async function generateSiteAssets(
  paths: WorkspacePaths = workspace,
  config: SiteConfig = siteConfig,
): Promise<void> {
  const libraryRoot = paths.packages.pangit;
  const siteRoot = paths.packages.site;
  const publicRoot = new URL("public/", paths.packages.site);
  const siteUrls = createSiteUrls(config);
  // Read after documentation generation; a static package import would cache the previous catalog.
  const documentation: DocumentationManifest = JSON.parse(
    await Deno.readTextFile(
      new URL("app/documentation/generated/manifest.json", siteRoot),
    ),
  );
  // Validate all source assets before clearing the derived copies.
  for (const provider of documentation.providers) {
    for (const version of provider.versions) {
      await Deno.stat(new URL(version.artifacts.openapi, siteRoot));
      await Deno.stat(new URL(version.artifacts.operations, siteRoot));
    }
  }
  const { assets } = config;
  if (!assets.brand.files.includes(assets.logo)) {
    throw new Error(`Configured logo is not a published brand asset: ${assets.logo}`);
  }
  const brandSource = new URL(assets.brand.source, libraryRoot);
  for (const file of assets.brand.files) {
    if (!file || file === "." || file === ".." || file.includes("/") || file.includes("\\")) {
      throw new Error(`Invalid brand asset filename: ${file}`);
    }
    const information = await Deno.stat(new URL(file, brandSource));
    if (!information.isFile) throw new Error(`Brand asset is not a file: ${file}`);
  }
  for (const path of [assets.openapi, assets.brand.path]) {
    const directory = path.replace(/^\//, "");
    try {
      await Deno.remove(new URL(directory, publicRoot), { recursive: true });
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    await Deno.mkdir(new URL(directory, publicRoot), { recursive: true });
  }
  for (const provider of documentation.providers) {
    for (const version of provider.versions) {
      const destination = new URL(siteUrls.spec(provider.id, version.version).slice(1), publicRoot);
      await Deno.mkdir(new URL("./", destination), { recursive: true });
      await Deno.copyFile(new URL(version.artifacts.openapi, siteRoot), destination);
      await Deno.copyFile(
        new URL(version.artifacts.operations, siteRoot),
        new URL(siteUrls.operations(provider.id, version.version).slice(1), publicRoot),
      );
    }
  }
  const brandDestination = new URL(`${assets.brand.path.slice(1)}/`, publicRoot);
  for (const file of assets.brand.files) {
    await Deno.copyFile(new URL(file, brandSource), new URL(file, brandDestination));
  }
}
