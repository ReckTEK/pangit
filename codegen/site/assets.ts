import type { DocumentationManifest } from "@mannsion/pangit-site/documentation";
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
  await Deno.stat(new URL(assets.brand.source, libraryRoot));
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
  await copyDirectory(
    new URL(assets.brand.source, libraryRoot),
    new URL(`${assets.brand.path.slice(1)}/`, publicRoot),
  );
}
