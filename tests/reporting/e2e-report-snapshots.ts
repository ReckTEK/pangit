import { relativePath, workspace, type WorkspacePaths } from "../../codegen/workspace-layout.ts";
import { assertE2EResultOwnership } from "../e2e-result-tree.ts";
import { type E2ERelease, readE2EReleases } from "../e2e-releases.ts";

export type CoverageMetric = { total: number; covered: number; percent: number };
export type E2EReportSummary = {
  provider: string;
  version: string;
  kind: "real-http-e2e";
  passed: boolean;
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
};

/** Validated raw evidence plus its deterministic Markdown and README destinations. */
export type E2EReportSnapshot = E2ERelease & {
  summary: E2EReportSummary;
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
  provider: string,
  version: string,
): E2EReportSummary {
  const summary = value as E2EReportSummary | null;
  const endpoints = summary?.endpoints;
  if (
    summary?.provider !== provider || summary.version !== version ||
    summary.kind !== "real-http-e2e" || typeof summary.passed !== "boolean" ||
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
    (summary.passed && (endpoints.passed !== endpoints.operations || endpoints.missing !== 0 ||
      endpoints.failedCases !== 0)) ||
    !["lines", "branches", "functions"].every((key) => {
      const metric = summary?.sourceCoverage?.[key as keyof E2EReportSummary["sourceCoverage"]];
      return metric && isCount(metric.total) && isCount(metric.covered) &&
        metric.covered <= metric.total && metric.percent ===
          (metric.total === 0 ? 100 : Number((100 * metric.covered / metric.total).toFixed(2)));
    })
  ) throw new Error(`Invalid E2E report summary: ${path}`);
  return summary;
}

/** Read every manifest-declared E2E snapshot; unknown directories never become documentation. */
export async function readE2EReportSnapshots(
  paths: WorkspacePaths = workspace,
  releases?: readonly E2ERelease[],
): Promise<readonly E2EReportSnapshot[]> {
  const snapshots: E2EReportSnapshot[] = [];
  const reportRoot = new URL("docs/test-results/", paths.packages.pangit);
  for (const release of releases ?? await readE2EReleases(paths)) {
    const { provider, version, results } = release;
    await assertE2EResultOwnership(results);
    const summaryPath = `${relativePath(paths.root, results)}/summary.json`;
    let value: unknown;
    try {
      value = JSON.parse(await Deno.readTextFile(new URL("summary.json", results)));
    } catch (error) {
      throw new Error(
        `Cannot read ${summaryPath}: ${error instanceof Error ? error.message : error}`,
      );
    }
    const reportPath = `${provider}/${version}/test-result.md`;
    const report = new URL(reportPath, reportRoot);
    const rawEvidenceLink = relativePath(new URL("./", report), results);
    snapshots.push({
      ...release,
      summary: validateSummary(value, summaryPath, provider, version),
      reportPath,
      readmeLink: relativePath(paths.root, report),
      rawEvidenceLink: rawEvidenceLink.startsWith(".") ? rawEvidenceLink : `./${rawEvidenceLink}`,
    });
  }
  return snapshots;
}
