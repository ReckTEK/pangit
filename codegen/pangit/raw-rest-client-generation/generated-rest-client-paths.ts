/** Package-relative root containing only REST clients generated from OpenAPI. */
export const generatedRestClientSourceRoot = "src/generated-rest-clients";

/** Package-relative generated runtime entry used by every generated REST client. */
export const generatedRestClientRuntimeArtifact = `${generatedRestClientSourceRoot}/runtime/mod.ts`;

/** Return the generated REST-client entrypoint for one Git host and API version. */
export function generatedRestClientArtifact(gitHost: string, version: string): string {
  assertPathSegment(gitHost, "Git host");
  assertPathSegment(version, "API version");
  return `${generatedRestClientSourceRoot}/${gitHost}/${version}/mod.ts`;
}

/** Resolve a manifest artifact relative to the generated REST-client source root. */
export function generatedRestClientRelativePath(artifact: string): string {
  const prefix = `${generatedRestClientSourceRoot}/`;
  if (!artifact.startsWith(prefix)) {
    throw new Error(
      `Generated REST-client artifact is outside ${generatedRestClientSourceRoot}: ${artifact}`,
    );
  }
  const relative = artifact.slice(prefix.length);
  const segments = relative.split("/");
  if (
    segments.length !== 3 || segments[2] !== "mod.ts" ||
    segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid generated REST-client artifact: ${artifact}`);
  }
  return relative;
}

function assertPathSegment(value: string, label: string): void {
  if (
    value.length === 0 || value === "." || value === ".." || value.includes("/") ||
    value.includes("\\")
  ) {
    throw new Error(`Invalid ${label} path segment: ${value}`);
  }
}
