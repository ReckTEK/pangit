import planValue from "./live-test-plan.json" with { type: "json" };

export type LiveTestPlanEntry = {
  displayName: string;
  rawRestClientTestCases: string;
  handWrittenFluentApiTest?: string;
  dockerEnvironmentDefinition: string;
  versions: Record<string, { containerImage: string }>;
};

export type LiveTestPlan = {
  schemaVersion: 1;
  gitHosts: Record<string, LiveTestPlanEntry>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertRepositoryPath(value: unknown, field: string): asserts value is string {
  if (
    typeof value !== "string" || value.length === 0 || value.startsWith("/") ||
    value.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new Error(`${field} must be a repository-relative path`);
  }
}

function validateLiveTestPlan(value: unknown): asserts value is LiveTestPlan {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.gitHosts)) {
    throw new Error("Live E2E test plan must contain schemaVersion 1 and a gitHosts map");
  }
  for (const [gitHost, untypedEntry] of Object.entries(value.gitHosts)) {
    if (!/^[a-z0-9-]+$/.test(gitHost) || !isRecord(untypedEntry)) {
      throw new Error(`Invalid live E2E Git host ${gitHost}`);
    }
    const entry = untypedEntry as Record<string, unknown>;
    if (typeof entry.displayName !== "string" || entry.displayName.length === 0) {
      throw new Error(`${gitHost}.displayName must be a non-empty string`);
    }
    assertRepositoryPath(
      entry.rawRestClientTestCases,
      `${gitHost}.rawRestClientTestCases`,
    );
    assertRepositoryPath(
      entry.dockerEnvironmentDefinition,
      `${gitHost}.dockerEnvironmentDefinition`,
    );
    if (entry.handWrittenFluentApiTest !== undefined) {
      assertRepositoryPath(
        entry.handWrittenFluentApiTest,
        `${gitHost}.handWrittenFluentApiTest`,
      );
    }
    if (!isRecord(entry.versions) || Object.keys(entry.versions).length === 0) {
      throw new Error(`${gitHost}.versions must be a non-empty object`);
    }
    for (const [version, untypedRelease] of Object.entries(entry.versions)) {
      if (!isRecord(untypedRelease) || typeof untypedRelease.containerImage !== "string") {
        throw new Error(`${gitHost} ${version} must declare a container image`);
      }
      const taggedImage = untypedRelease.containerImage.split("@", 1)[0];
      if (
        !taggedImage.endsWith(`:${version}`) &&
        !(gitHost === "gitlab" &&
          (taggedImage.endsWith(`:${version}-ce.0`) || taggedImage.endsWith(`:${version}-ee.0`)))
      ) {
        throw new Error(`${gitHost} container image does not match version ${version}`);
      }
    }
  }
}

validateLiveTestPlan(planValue);

/** Hand-written declaration of which generated and fluent tests run against live Git hosts. */
export const liveTestPlan: LiveTestPlan = planValue;
