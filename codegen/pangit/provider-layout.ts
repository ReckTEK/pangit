/** Package-relative source root owned by provider generation. */
export const providerSourceRoot = "src/providers";

/** Package-relative generated runtime entry used by every provider client. */
export const providerRuntimeArtifact = `${providerSourceRoot}/runtime/mod.ts`;

/** Return the manifest-owned client entry for one provider/version pair. */
export function providerClientArtifact(provider: string, version: string): string {
  assertSegment(provider, "provider");
  assertSegment(version, "version");
  return `${providerSourceRoot}/${provider}/${version}/mod.ts`;
}

/** Resolve a manifest client artifact relative to the generated provider source root. */
export function generatedProviderClientPath(artifact: string): string {
  const prefix = `${providerSourceRoot}/`;
  if (!artifact.startsWith(prefix)) {
    throw new Error(`Provider client artifact is outside ${providerSourceRoot}: ${artifact}`);
  }
  const relative = artifact.slice(prefix.length);
  const segments = relative.split("/");
  if (
    segments.length !== 3 || segments[2] !== "mod.ts" ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid provider client artifact: ${artifact}`);
  }
  return relative;
}

/** Return repository-relative E2E artifact paths for one provider/version pair. */
export function providerTestArtifacts(provider: string, version: string) {
  assertSegment(provider, "provider");
  assertSegment(version, "version");
  const tests = `tests/providers/${provider}/${version}`;
  return {
    tests,
    results: `${tests}/results`,
    compose: `${tests}/compose.yaml`,
  } as const;
}

function assertSegment(value: string, label: string): void {
  if (
    value.length === 0 || value === "." || value === ".." || value.includes("/") ||
    value.includes("\\")
  ) {
    throw new Error(`Invalid ${label} path segment: ${value}`);
  }
}
