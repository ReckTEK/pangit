/** REST-client generation: coordinate manifests, rendering, validation, and publication. */
import {
  typeCheckGeneratedDirectory,
  validateGeneratedSources,
} from "./validate-generated-sources.ts";
import { workspace } from "../../workspace-layout.ts";
import type { WorkspacePaths } from "../../workspace-layout.ts";
import {
  generatedRestClientRelativePath,
  generatedRestClientSourceRoot,
} from "./generated-rest-client-paths.ts";
import {
  assertExpectedProviderSet,
  assertPublicNamesCurrent,
  readPublicNamesManifest,
  readSpecManifest,
  sortRecord,
} from "./rest-client-manifests.ts";
import type {
  ProviderPublicNames,
  RestClientPublicNamesManifest,
} from "./rest-client-manifests.ts";
import { compareText } from "./naming.ts";
import { parseOpenApiDocument } from "./openapi.ts";
import { renderPackageConfigurationWithProviderClientExports } from "./rest-client-package-exports.ts";
import {
  assertGeneratedSourcesCurrent,
  formatGeneratedSources,
  publishGeneratedClientOutput,
  withGeneratedOwnershipMarkers,
} from "./publish-generated-rest-clients.ts";
import { renderProviderClientFiles } from "./render-rest-client-files.ts";
import { renderProviderRegistryFiles } from "./render-rest-client-registry.ts";
import { generatedComment } from "../../generated-notices.ts";

// Preserve the established generator API while implementations live with their responsibility.
export {
  assertExpectedProviderSet,
  expectedRestClientProviders,
  generatedClientClassName,
} from "./rest-client-manifests.ts";
export type {
  ProviderPublicNames,
  RestClientPublicNamesManifest,
} from "./rest-client-manifests.ts";
export {
  publishGeneratedClientOutput,
  withGeneratedOwnershipMarkers,
} from "./publish-generated-rest-clients.ts";
export { describeClientOperations, renderProviderClient } from "./render-rest-client-files.ts";
export type { ClientOperationDescriptor } from "./render-rest-client-files.ts";

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
    new URL("raw-rest-client-generation/openapi-specifications/normalized/", paths.codegen.pangit);
  const generatedClientsDirectory = options.generatedClientsDirectory ??
    new URL(`${generatedRestClientSourceRoot}/`, paths.packages.pangit);
  const legacyGeneratedClientDirectory = options.generatedClientsDirectory === undefined
    ? new URL("src/providers/", paths.packages.pangit)
    : undefined;
  const publicNamesFile = options.publicNamesFile ??
    new URL("raw-rest-client-generation/public-names.json", paths.codegen.pangit);
  const packageConfigurationFile = options.packageConfigurationFile ??
    new URL("deno.json", paths.packages.pangit);
  const specManifestFile = options.specManifestFile ??
    new URL(
      "raw-rest-client-generation/openapi-specifications/downloaded/generated-manifest.json",
      paths.codegen.pangit,
    );
  if (options.check && options.updatePublicNames) {
    throw new Error("Public-name update cannot run in check mode");
  }
  const manifest = await readSpecManifest(specManifestFile);
  const providers = Object.keys(manifest.gitHosts).toSorted(compareText);
  assertExpectedProviderSet(providers);
  const lockedNames = await readPublicNamesManifest(
    publicNamesFile,
    options.updatePublicNames ?? false,
  );

  const rendered = await renderRuntimeSources(
    new URL("raw-rest-client-generation/generated-runtime-template/", paths.codegen.pangit),
  );
  const capturedProviders: Record<string, ProviderPublicNames> = {};
  for (const provider of providers) {
    const providerManifest = manifest.gitHosts[provider];
    for (const version of Object.keys(providerManifest.versions).toSorted(compareText)) {
      const versionManifest = providerManifest.versions[version];
      const artifacts = versionManifest.artifacts;
      const document = parseOpenApiDocument(
        await Deno.readTextFile(
          new URL(
            artifacts.normalized.replace(
              /^codegen\/pangit\/raw-rest-client-generation\/openapi-specifications\/normalized\//,
              "",
            ),
            normalizedSpecsDirectory,
          ),
        ),
        `${provider} ${version}`,
      );
      const clientPath = generatedRestClientRelativePath(artifacts.client);
      const versionPath = clientPath.slice(0, -"mod.ts".length);
      for (
        const [name, source] of renderProviderClientFiles(provider, document, {
          names: providerManifest.client,
          captureNames: version === providerManifest.selected
            ? (names) => capturedProviders[provider] = names
            : undefined,
          lockedNames: lockedNames.providers[provider],
          provenance: versionManifest.license === null
            ? {
              specificationSource: versionManifest.source,
              specificationSha256: versionManifest.sha256,
              licenseSpdx: null,
              licenseSource: null,
              licenseSha256: null,
              licenseDeclaration: null,
              attribution: null,
            }
            : {
              specificationSource: versionManifest.source,
              specificationSha256: versionManifest.sha256,
              licenseSpdx: versionManifest.license.spdx,
              licenseSource: versionManifest.license.text.source,
              licenseSha256: versionManifest.license.text.sha256,
              licenseDeclaration: versionManifest.license.declaration,
              attribution: versionManifest.license.attribution,
            },
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
      legacyGeneratedClientDirectory !== undefined &&
      await pathExists(legacyGeneratedClientDirectory)
    ) {
      throw new Error(
        `Legacy generated-client root still exists: ${legacyGeneratedClientDirectory.pathname}`,
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
      retiredDirectories: legacyGeneratedClientDirectory === undefined
        ? undefined
        : [legacyGeneratedClientDirectory],
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
