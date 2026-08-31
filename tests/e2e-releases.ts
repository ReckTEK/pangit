import { providerTestArtifacts } from "../codegen/pangit/provider-layout.ts";
import type { GeneratedE2EManifest, SpecManifest } from "../codegen/pangit/tests/e2e-manifest.ts";
import { generatedTestOwnershipMarker } from "../codegen/pangit/tests/generated-test-tree.ts";
import { workspace, type WorkspacePaths } from "../codegen/workspace-layout.ts";

/** One manifest-authorized provider/version E2E release and its resolved repository paths. */
export interface E2ERelease {
  provider: string;
  displayName: string;
  version: string;
  tests: URL;
  results: URL;
  compose: URL;
  auth: URL;
  manifest: GeneratedE2EManifest;
}

/** Read the generated E2E releases declared by the provider manifest in stable name order. */
export async function readE2EReleases(
  paths: WorkspacePaths = workspace,
): Promise<readonly E2ERelease[]> {
  const specManifest: SpecManifest = JSON.parse(
    await Deno.readTextFile(new URL("specs/raw/manifest.json", paths.codegen.pangit)),
  );
  const releases: E2ERelease[] = [];
  for (
    const [provider, definition] of Object.entries(specManifest.providers).toSorted((
      [left],
      [right],
    ) => left.localeCompare(right))
  ) {
    if (!definition.testing) continue;
    if (!definition.client.displayName) {
      throw new Error(`${provider}: E2E client display name is missing`);
    }
    for (
      const [version, release] of Object.entries(definition.versions).toSorted(([left], [right]) =>
        left.localeCompare(right)
      )
    ) {
      const expected = providerTestArtifacts(provider, version);
      for (const name of ["tests", "results", "compose"] as const) {
        if (release.artifacts[name] !== expected[name]) {
          throw new Error(
            `${provider} ${version}: ${name} artifact must be ${expected[name]}, got ${
              release.artifacts[name]
            }`,
          );
        }
      }
      const tests = new URL(`${expected.tests}/`, paths.root);
      let manifest: GeneratedE2EManifest;
      try {
        if (
          await Deno.readTextFile(new URL(".generated", tests)) !==
            generatedTestOwnershipMarker
        ) {
          throw new Error("invalid generated-suite ownership marker");
        }
        manifest = JSON.parse(await Deno.readTextFile(new URL("manifest.json", tests)));
        if (!(await Deno.stat(new URL("compose.yaml", tests))).isFile) {
          throw new Error("generated Compose artifact is not a file");
        }
      } catch (error) {
        throw new Error(
          `${provider} ${version}: generated E2E manifest is unavailable; run deno task generate. ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
      if (
        manifest.provider !== provider || manifest.version !== version ||
        manifest.image !== release.containerImage ||
        typeof manifest.runner?.name !== "string" ||
        typeof manifest.runner.results !== "string" ||
        typeof manifest.service?.name !== "string"
      ) {
        throw new Error(`${provider} ${version}: generated E2E manifest is stale`);
      }
      releases.push({
        provider,
        displayName: definition.client.displayName,
        version,
        tests,
        results: new URL("results/", tests),
        compose: new URL("compose.yaml", tests),
        auth: new URL(".auth/", tests),
        manifest,
      });
    }
  }
  if (!releases.length) throw new Error("The provider manifest declares no E2E releases");
  return releases;
}
