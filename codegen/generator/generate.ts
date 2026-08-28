/** Coordinate manifests, source rendering, and validated publication of the complete client tree. */
import { workspace } from "../workspace.ts";
import type { WorkspacePaths } from "../workspace.ts";
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
import {
  assertGeneratedSourcesCurrent,
  formatGeneratedSources,
  replaceGeneratedDirectory,
  typeCheckGeneratedDirectory,
  validateGeneratedSources,
} from "./output.ts";
import { renderGeneratedModule, renderProviderClient } from "./render.ts";

// Preserve the established generator API while implementations live with their responsibility.
export {
  assertExpectedProviderSet,
  expectedRestClientProviders,
  generatedClientClassName,
} from "./client-manifests.ts";
export type { ProviderPublicNames, RestClientPublicNamesManifest } from "./client-manifests.ts";
export { replaceGeneratedDirectory } from "./output.ts";
export { describeClientOperations, renderProviderClient } from "./render.ts";
export type { ClientOperationDescriptor } from "./render.ts";

export type RestClientGenerationOptions = {
  workspace?: WorkspacePaths;
  /** Compare rendered output with the destination without writing. */
  check?: boolean;
  generatedClientsDirectory?: URL;
  normalizedSpecsDirectory?: URL;
  publicNamesFile?: URL;
  specManifestFile?: URL;
  /** Refresh reviewed names while preserving every still-present locked allocation. */
  updatePublicNames?: boolean;
};

/** Render, format, validate, then atomically replace or check the complete generated tree. */
export async function generateRestClients(
  options: RestClientGenerationOptions = {},
): Promise<void> {
  const paths = options.workspace ?? workspace;
  const denoConfiguration = new URL("deno.json", paths.root);
  const normalizedSpecsDirectory = options.normalizedSpecsDirectory ??
    new URL("specs/normalized/", paths.codegen);
  const generatedClientsDirectory = options.generatedClientsDirectory ??
    new URL("src/generated/", paths.packages.pangit);
  const publicNamesFile = options.publicNamesFile ??
    new URL("generator/public-names.json", paths.codegen);
  const specManifestFile = options.specManifestFile ??
    new URL("specs/raw/manifest.json", paths.codegen);
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

  const rendered = new Map<string, string>();
  const capturedProviders: Record<string, ProviderPublicNames> = {};
  for (const provider of providers) {
    const providerManifest = manifest.providers[provider];
    for (const version of Object.keys(providerManifest.versions).toSorted(compareText)) {
      const artifacts = providerManifest.versions[version].artifacts;
      const document = parseOpenApiDocument(
        await Deno.readTextFile(
          new URL(
            artifacts.normalized.replace(/^codegen\/specs\/normalized\//, ""),
            normalizedSpecsDirectory,
          ),
        ),
        `${provider} ${version}`,
      );
      rendered.set(
        artifacts.client.replace(/^src\/generated\//, ""),
        renderProviderClient(provider, document, {
          names: providerManifest.client,
          captureNames: version === providerManifest.selected
            ? (names) => capturedProviders[provider] = names
            : undefined,
          lockedNames: lockedNames.providers[provider],
          restModulePath: "../../../rest.ts",
        }),
      );
    }
  }
  rendered.set("mod.ts", renderGeneratedModule(manifest));
  const capturedNames: RestClientPublicNamesManifest = {
    version: 1,
    providers: sortRecord(capturedProviders),
  };
  if (!options.updatePublicNames) assertPublicNamesCurrent(lockedNames, capturedNames);

  const formatted = await formatGeneratedSources(rendered, denoConfiguration);
  if (options.check) {
    await validateGeneratedSources(generatedClientsDirectory, formatted, denoConfiguration);
    await assertGeneratedSourcesCurrent(generatedClientsDirectory, formatted);
  } else {
    await replaceGeneratedDirectory(generatedClientsDirectory, formatted, {
      validate: (stage) => typeCheckGeneratedDirectory(stage, denoConfiguration),
      manifest: options.updatePublicNames
        ? {
          file: publicNamesFile,
          source: `${JSON.stringify(capturedNames, null, 2)}\n`,
        }
        : undefined,
    });
  }
}
