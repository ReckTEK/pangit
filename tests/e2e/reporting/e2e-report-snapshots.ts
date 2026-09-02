import { relativePath, workspace, type WorkspacePaths } from "../../../codegen/workspace-layout.ts";
import { assertLiveTestResultOwnership } from "../result-management/prepare-result-directories.ts";
import {
  discoverGeneratedLiveTests,
  type LiveTestRelease,
} from "../runner/discover-generated-live-tests.ts";

export type CoverageMetric = { total: number; covered: number; percent: number };
export type HandWrittenFluentApiContractsSummary = {
  schemaVersion: 1;
  gitHost: string;
  version: string;
  kind: "hand-written-fluent-api-contracts";
  passed: boolean;
  contracts: Array<{
    name: string;
    passed: boolean;
    assertions: string[];
  }>;
};
export type LiveTestSummary = {
  gitHost: string;
  version: string;
  containerImage: string;
  kind: "real-http-e2e";
  passed: boolean;
  suites: {
    generatedRawRestClientTest: {
      kind: "generated-raw-rest-client-test";
      passed: boolean;
      junit: "generated-raw-rest-client-test/junit.xml";
      log: "generated-raw-rest-client-test/test.log";
    };
    handWrittenFluentApiTest?: {
      kind: "hand-written-fluent-api-test";
      passed: boolean;
      junit: "hand-written-fluent-api-test/junit.xml";
      log: "hand-written-fluent-api-test/test.log";
      evidence: "hand-written-fluent-api-test/fluent-api-contracts.json";
    };
  };
  endpoints: {
    operations: number;
    passed: number;
    positive: number;
    negativeOnly: number;
    missing: number;
    failedCases: number;
    cases: number;
  };
  sourceCoverage: { lines: CoverageMetric; branches: CoverageMetric; functions: CoverageMetric };
  handWrittenFluentApiContracts?: HandWrittenFluentApiContractsSummary;
};

/** Validated live-test evidence plus its deterministic documentation destinations. */
export type LiveTestReportSnapshot = LiveTestRelease & {
  summary: LiveTestSummary;
  reportPath: string;
  readmeLink: string;
  rawEvidenceLink: string;
};

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validateSummary(
  value: unknown,
  path: string,
  gitHost: string,
  version: string,
  requiresHandWrittenFluentApiTest: boolean,
): LiveTestSummary {
  const summary = value as LiveTestSummary | null;
  const endpoints = summary?.endpoints;
  const generatedRawTest = summary?.suites?.generatedRawRestClientTest;
  const handWrittenFluentTest = summary?.suites?.handWrittenFluentApiTest;
  const contracts = summary?.handWrittenFluentApiContracts;
  if (
    summary?.gitHost !== gitHost || summary.version !== version ||
    summary.kind !== "real-http-e2e" || typeof summary.passed !== "boolean" ||
    generatedRawTest?.kind !== "generated-raw-rest-client-test" ||
    typeof generatedRawTest.passed !== "boolean" ||
    generatedRawTest.junit !== "generated-raw-rest-client-test/junit.xml" ||
    generatedRawTest.log !== "generated-raw-rest-client-test/test.log" ||
    (requiresHandWrittenFluentApiTest
      ? handWrittenFluentTest === undefined || contracts === undefined
      : handWrittenFluentTest !== undefined || contracts !== undefined) ||
    (handWrittenFluentTest !== undefined &&
      (handWrittenFluentTest.kind !== "hand-written-fluent-api-test" ||
        typeof handWrittenFluentTest.passed !== "boolean" ||
        handWrittenFluentTest.junit !== "hand-written-fluent-api-test/junit.xml" ||
        handWrittenFluentTest.log !== "hand-written-fluent-api-test/test.log" ||
        handWrittenFluentTest.evidence !==
          "hand-written-fluent-api-test/fluent-api-contracts.json")) ||
    summary.passed !== (generatedRawTest.passed && (handWrittenFluentTest?.passed ?? true)) ||
    !endpoints ||
    ![
      endpoints.operations,
      endpoints.passed,
      endpoints.positive,
      endpoints.negativeOnly,
      endpoints.missing,
      endpoints.failedCases,
      endpoints.cases,
    ].every(isCount) ||
    endpoints.operations === 0 || endpoints.passed + endpoints.missing > endpoints.operations ||
    endpoints.positive + endpoints.negativeOnly !== endpoints.passed ||
    endpoints.cases < endpoints.passed || endpoints.failedCases > endpoints.cases ||
    (generatedRawTest.passed &&
      (endpoints.passed !== endpoints.operations || endpoints.missing !== 0 ||
        endpoints.failedCases !== 0)) ||
    (contracts !== undefined &&
      (contracts.schemaVersion !== 1 || contracts.gitHost !== gitHost ||
        contracts.version !== version || contracts.kind !== "hand-written-fluent-api-contracts" ||
        typeof contracts.passed !== "boolean" || !Array.isArray(contracts.contracts) ||
        contracts.contracts.length === 0 ||
        contracts.contracts.some((contract) =>
          typeof contract.name !== "string" || typeof contract.passed !== "boolean" ||
          !Array.isArray(contract.assertions) || contract.assertions.length === 0 ||
          contract.assertions.some((assertion) => typeof assertion !== "string")
        ) || contracts.passed !== contracts.contracts.every((contract) => contract.passed) ||
        handWrittenFluentTest?.passed !== contracts.passed)) ||
    !["lines", "branches", "functions"].every((key) => {
      const metric = summary?.sourceCoverage?.[key as keyof LiveTestSummary["sourceCoverage"]];
      return metric && isCount(metric.total) && isCount(metric.covered) &&
        metric.covered <= metric.total && metric.percent ===
          (metric.total === 0 ? 100 : Number((100 * metric.covered / metric.total).toFixed(2)));
    })
  ) throw new Error(`Invalid live-test report summary: ${path}`);
  return summary;
}

/** Require every file named by a validated suite summary and match contract evidence to its rollup. */
async function validateSuiteEvidence(
  results: URL,
  summary: LiveTestSummary,
  summaryPath: string,
): Promise<void> {
  const requireFile = async (name: string): Promise<URL> => {
    const path = new URL(name, results);
    try {
      if (!(await Deno.stat(path)).isFile) throw new Error("not a file");
    } catch (error) {
      throw new Error(
        `Invalid live-test suite evidence referenced by ${summaryPath}: ${name} (${
          error instanceof Error ? error.message : error
        })`,
      );
    }
    return path;
  };

  const generatedRawTest = summary.suites.generatedRawRestClientTest;
  await requireFile(generatedRawTest.junit);
  await requireFile(generatedRawTest.log);
  await requireFile("generated-raw-rest-client-test/coverage.lcov");
  await requireFile("generated-raw-rest-client-test/coverage/index.html");
  const handWrittenFluentTest = summary.suites.handWrittenFluentApiTest;
  const contracts = summary.handWrittenFluentApiContracts;
  if (handWrittenFluentTest === undefined || contracts === undefined) return;

  await requireFile(handWrittenFluentTest.junit);
  await requireFile(handWrittenFluentTest.log);
  const evidencePath = await requireFile(handWrittenFluentTest.evidence);
  let evidence: HandWrittenFluentApiContractsSummary | null;
  try {
    evidence = JSON.parse(await Deno.readTextFile(evidencePath));
  } catch (error) {
    throw new Error(
      `Invalid hand-written fluent API evidence referenced by ${summaryPath}: ${handWrittenFluentTest.evidence} (${
        error instanceof Error ? error.message : error
      })`,
    );
  }
  if (
    evidence?.schemaVersion !== contracts.schemaVersion ||
    evidence.gitHost !== contracts.gitHost || evidence.version !== contracts.version ||
    evidence.kind !== contracts.kind || evidence.passed !== contracts.passed ||
    JSON.stringify(evidence.contracts) !== JSON.stringify(contracts.contracts)
  ) {
    throw new Error(
      `Hand-written fluent API evidence disagrees with ${summaryPath}: ${handWrittenFluentTest.evidence}`,
    );
  }
}

/** Read every declared live-test snapshot; unknown directories never become documentation. */
export async function readLiveTestReportSnapshots(
  paths: WorkspacePaths = workspace,
  releases?: readonly LiveTestRelease[],
): Promise<readonly LiveTestReportSnapshot[]> {
  const snapshots: LiveTestReportSnapshot[] = [];
  const reportRoot = new URL("docs/test-results/", paths.packages.pangit);
  for (const release of releases ?? await discoverGeneratedLiveTests(paths)) {
    const { gitHost, version, results } = release;
    await assertLiveTestResultOwnership(results);
    const summaryPath = `${relativePath(paths.root, results)}/summary.json`;
    let value: unknown;
    try {
      value = JSON.parse(await Deno.readTextFile(new URL("summary.json", results)));
    } catch (error) {
      throw new Error(
        `Cannot read ${summaryPath}: ${error instanceof Error ? error.message : error}`,
      );
    }
    const reportPath = `${gitHost}/${version}/test-result.md`;
    const report = new URL(reportPath, reportRoot);
    const rawEvidenceLink = relativePath(new URL("./", report), results);
    const summary = validateSummary(
      value,
      summaryPath,
      gitHost,
      version,
      release.run.suites.handWrittenFluentApiTest !== undefined,
    );
    await validateSuiteEvidence(results, summary, summaryPath);
    snapshots.push({
      ...release,
      summary,
      reportPath,
      readmeLink: relativePath(paths.root, report),
      rawEvidenceLink: rawEvidenceLink.startsWith(".") ? rawEvidenceLink : `./${rawEvidenceLink}`,
    });
  }
  return snapshots;
}
