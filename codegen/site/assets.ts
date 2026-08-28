import type { DocumentationManifest } from "@mannsion/pangit/documentation";
import { type SiteConfig, siteConfig } from "@mannsion/pangit-site/config";
import { createSiteUrls } from "@mannsion/pangit-site/urls";
import { workspace, type WorkspacePaths } from "../workspace.ts";

async function copyDirectory(source: URL, destination: URL): Promise<void> {
  await Deno.mkdir(destination, { recursive: true });
  for await (const entry of Deno.readDir(source)) {
    if (entry.isDirectory) {
      await copyDirectory(
        new URL(`${entry.name}/`, source),
        new URL(`${entry.name}/`, destination),
      );
    } else if (entry.isFile) {
      await Deno.copyFile(new URL(entry.name, source), new URL(entry.name, destination));
    }
  }
}

export async function generateSiteAssets(
  paths: WorkspacePaths = workspace,
  config: SiteConfig = siteConfig,
): Promise<void> {
  const libraryRoot = paths.packages.pangit;
  const publicRoot = new URL("public/", paths.packages.site);
  const siteUrls = createSiteUrls(config);
  // Read after documentation generation; a static package import would cache the previous catalog.
  const documentation: DocumentationManifest = JSON.parse(
    await Deno.readTextFile(new URL("src/documentation/generated/manifest.json", libraryRoot)),
  );
  // Validate all source assets before clearing the derived copies.
  for (const provider of documentation.providers) {
    for (const version of provider.versions) {
      await Deno.stat(new URL(version.artifacts.openapi, libraryRoot));
      await Deno.stat(new URL(version.artifacts.operations, libraryRoot));
    }
  }
  const { assets } = config;
  for (const { source } of [assets.brand, assets.examples]) {
    await Deno.stat(new URL(source, libraryRoot));
  }
  for (const path of [assets.openapi, assets.brand.path, assets.examples.path]) {
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
      await Deno.copyFile(new URL(version.artifacts.openapi, libraryRoot), destination);
      await Deno.copyFile(
        new URL(version.artifacts.operations, libraryRoot),
        new URL(siteUrls.operations(provider.id, version.version).slice(1), publicRoot),
      );
    }
  }
  for (const { source, path } of [assets.brand, assets.examples]) {
    await copyDirectory(new URL(source, libraryRoot), new URL(`${path.slice(1)}/`, publicRoot));
  }
}
