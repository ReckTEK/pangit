/** Paths written by E2E asset generation or by the live E2E runner for one Git host release. */
export function generatedE2ETestPaths(gitHost: string, version: string) {
  assertPathSegment(gitHost, "Git host");
  assertPathSegment(version, "API version");
  const generatedRawRestClientTest =
    `tests/e2e/generated/raw-rest-client-tests/${gitHost}/${version}`;
  const generatedDockerEnvironment =
    `tests/e2e/generated/docker-environments/${gitHost}/${version}`;
  return {
    generatedRawRestClientTest,
    generatedDockerEnvironment,
    runManifest: `${generatedDockerEnvironment}/generated-test-run.json`,
    compose: `${generatedDockerEnvironment}/compose.yaml`,
    results: `tests/e2e/results/${gitHost}/${version}`,
  } as const;
}

function assertPathSegment(value: string, label: string): void {
  if (
    value.length === 0 || value === "." || value === ".." || value.includes("/") ||
    value.includes("\\")
  ) {
    throw new Error(`Invalid ${label} path segment: ${value}`);
  }
}
