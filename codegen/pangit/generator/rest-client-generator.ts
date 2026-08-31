/** REST-client generation: coordinate manifests, rendering, validation, and publication. */
import { workspace } from "../../workspace-layout.ts";
import { generatedProviderClientPath, providerSourceRoot } from "../provider-layout.ts";
import type { WorkspacePaths } from "../../workspace-layout.ts";
import {
  assertExpectedProviderSet,
  assertPublicNamesCurrent,
  readPublicNamesManifest,
  readSpecManifest,
  sortRecord,
} from "./client-manifests.ts";
import type { ProviderPublicNames, RestClientPublicNamesManifest } from "./client-manifests.ts";
import { compareText } from "./naming.ts";
import { parseOpenApiDocument } from "./openapi.ts";
import { renderPackageConfigurationWithProviderClientExports } from "./provider-client-package-exports.ts";
import {
  assertGeneratedSourcesCurrent,
  formatGeneratedSources,
  publishGeneratedClientOutput,
  typeCheckGeneratedDirectory,
  validateGeneratedSources,
  withGeneratedOwnershipMarkers,
} from "./output.ts";
import { renderProviderClientFiles } from "./render.ts";
import { renderProviderRegistryFiles } from "./render-provider-registry.ts";
import { generatedComment } from "../../generated-notices.ts";

// Preserve the established generator API while implementations live with their responsibility.
export {
  assertExpectedProviderSet,
  expectedRestClientProviders,
  generatedClientClassName,
} from "./client-manifests.ts";
export type { ProviderPublicNames, RestClientPublicNamesManifest } from "./client-manifests.ts";
export { publishGeneratedClientOutput, withGeneratedOwnershipMarkers } from "./output.ts";
export { describeClientOperations, renderProviderClient } from "./render.ts";
export type { ClientOperationDescriptor } from "./render.ts";

export type RestClientGenerationOptions = {
  workspace?: WorkspacePaths;
  /** Compare rendered output with the destination without writing. */
  check?: boolean;
  generatedClientsDirectory?: URL;
  normalizedSpecsDirectory?: URL;
  publicNamesFile?: URL;
  packageConfigurationFile?: URL;
  specManifestFile?: URL;
  /** Refresh reviewed names while preserving every still-present locked allocation. */
  updatePublicNames?: boolean;
};

/** Render, format, validate, then publish or check every generated provider/version client. */
export async function generateRestClients(
  options: RestClientGenerationOptions = {},
): Promise<void> {
  const paths = options.workspace ?? workspace;
  const denoConfiguration = new URL("deno.json", paths.root);
  const normalizedSpecsDirectory = options.normalizedSpecsDirectory ??
    new URL("specs/normalized/", paths.codegen.pangit);
  const generatedClientsDirectory = options.generatedClientsDirectory ??
    new URL(`${providerSourceRoot}/`, paths.packages.pangit);
  const retiredGeneratedClientsDirectory = options.generatedClientsDirectory === undefined
    ? new URL("providers/", paths.packages.pangit)
    : undefined;
  const publicNamesFile = options.publicNamesFile ??
    new URL("generator/public-names.json", paths.codegen.pangit);
  const packageConfigurationFile = options.packageConfigurationFile ??
    new URL("deno.json", paths.packages.pangit);
  const specManifestFile = options.specManifestFile ??
    new URL("specs/raw/manifest.json", paths.codegen.pangit);
  if (options.check && options.updatePublicNames) {
    throw new Error("Public-name update cannot run in check mode");
  }
  const manifest = await readSpecManifest(specManifestFile);
  const providers = Object.keys(manifest.providers).toSorted(compareText);
  assertExpectedProviderSet(providers);
  const lockedNames = await readPublicNamesManifest(
    publicNamesFile,
    options.updatePublicNames ?? false,
  );

  const rendered = await renderRuntimeSources(new URL("generator/runtime/", paths.codegen.pangit));
  const capturedProviders: Record<string, ProviderPublicNames> = {};
  for (const provider of providers) {
    const providerManifest = manifest.providers[provider];
    for (const version of Object.keys(providerManifest.versions).toSorted(compareText)) {
      const artifacts = providerManifest.versions[version].artifacts;
      const document = parseOpenApiDocument(
        await Deno.readTextFile(
          new URL(
            artifacts.normalized.replace(/^codegen\/pangit\/specs\/normalized\//, ""),
            normalizedSpecsDirectory,
          ),
        ),
        `${provider} ${version}`,
      );
      const clientPath = generatedProviderClientPath(artifacts.client);
      const versionPath = clientPath.slice(0, -"mod.ts".length);
      for (
        const [name, source] of renderProviderClientFiles(provider, document, {
          names: providerManifest.client,
          captureNames: version === providerManifest.selected
            ? (names) => capturedProviders[provider] = names
            : undefined,
          lockedNames: lockedNames.providers[provider],
          restModulePath: "../../runtime/mod.ts",
        })
      ) {
        rendered.set(`${versionPath}${name}`, source);
      }
    }
  }
  for (const [name, source] of renderProviderRegistryFiles(manifest)) {
    rendered.set(name, source);
  }
  const capturedNames: RestClientPublicNamesManifest = {
    version: 1,
    providers: sortRecord(capturedProviders),
  };
  if (!options.updatePublicNames) assertPublicNamesCurrent(lockedNames, capturedNames);

  const currentPackageConfiguration = await Deno.readTextFile(packageConfigurationFile);
  const synchronizedPackageConfiguration = renderPackageConfigurationWithProviderClientExports(
    currentPackageConfiguration,
    manifest,
    packageConfigurationFile.pathname,
  );

  const formatted = await formatGeneratedSources(
    withGeneratedOwnershipMarkers(rendered),
    denoConfiguration,
  );
  if (options.check) {
    await validateGeneratedSources(generatedClientsDirectory, formatted, denoConfiguration);
    await assertGeneratedSourcesCurrent(generatedClientsDirectory, formatted);
    if (
      retiredGeneratedClientsDirectory !== undefined &&
      await pathExists(retiredGeneratedClientsDirectory)
    ) {
      throw new Error(
        `Retired generated provider root still exists: ${retiredGeneratedClientsDirectory.pathname}`,
      );
    }
    if (currentPackageConfiguration !== synchronizedPackageConfiguration) {
      throw new Error(
        `Generated provider exports are not current: ${packageConfigurationFile.pathname}`,
      );
    }
  } else {
    await publishGeneratedClientOutput(generatedClientsDirectory, formatted, {
      validate: (stage) => typeCheckGeneratedDirectory(stage, denoConfiguration),
      manifest: options.updatePublicNames
        ? {
          file: publicNamesFile,
          source: `${JSON.stringify(capturedNames, null, 2)}\n`,
        }
        : undefined,
      sidecars: currentPackageConfiguration === synchronizedPackageConfiguration ? undefined : [{
        file: packageConfigurationFile,
        label: "package provider exports",
        source: synchronizedPackageConfiguration,
      }],
      retiredDirectories: retiredGeneratedClientsDirectory === undefined
        ? undefined
        : [retiredGeneratedClientsDirectory],
    });
  }
}

async function pathExists(path: URL): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function renderRuntimeSources(directory: URL): Promise<Map<string, string>> {
  const sources = new Map<string, string>();
  await collectRuntimeSources(directory, "runtime/", sources);
  if (!sources.has("runtime/mod.ts")) {
    throw new Error(`Generated runtime source is missing mod.ts: ${directory.pathname}`);
  }
  return sources;
}

async function collectRuntimeSources(
  directory: URL,
  outputPrefix: string,
  sources: Map<string, string>,
): Promise<void> {
  const entries: Deno.DirEntry[] = [];
  for await (const entry of Deno.readDir(directory)) entries.push(entry);
  for (const entry of entries.toSorted((left, right) => compareText(left.name, right.name))) {
    if (entry.isDirectory) {
      await collectRuntimeSources(
        new URL(`${encodeURIComponent(entry.name)}/`, directory),
        `${outputPrefix}${entry.name}/`,
        sources,
      );
      continue;
    }
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    const source = await Deno.readTextFile(new URL(entry.name, directory));
    sources.set(`${outputPrefix}${entry.name}`, `${generatedComment("//")}${source}`);
  }
}
