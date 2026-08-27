import { rawResultDirectories, type RawResults } from "../results.ts";

export type CoverageMetric = { total: number; covered: number; percent: number };
export type ReportSummary = {
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
export type ReportSnapshot = RawResults & { summary: ReportSummary; markdown: string };

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validateSummary(
  value: unknown,
  path: string,
  provider: string,
  version: string,
): ReportSummary {
  const summary = value as ReportSummary | null;
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
      const metric = summary?.sourceCoverage?.[key as keyof ReportSummary["sourceCoverage"]];
      return metric && isCount(metric.total) && isCount(metric.covered) &&
        metric.covered <= metric.total && metric.percent ===
          (metric.total === 0 ? 100 : Number((100 * metric.covered / metric.total).toFixed(2)));
    })
  ) throw new Error(`Invalid report summary: ${path}`);
  return summary;
}

export async function readReportSummaries(root: URL): Promise<ReportSnapshot[]> {
  const reports: ReportSnapshot[] = [];
  try {
    for (const result of await rawResultDirectories(new URL("src/generated/", root))) {
      const { provider, version, directory } = result;
      if (![provider, version].every((name) => /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(name))) {
        throw new Error(`Invalid report provider/version: ${provider}/${version}`);
      }
      const path = `src/generated/${provider}/${version}/tests/results/summary.json`;
      let value: unknown;
      try {
        value = JSON.parse(await Deno.readTextFile(new URL("summary.json", directory)));
      } catch (error) {
        throw new Error(`Cannot read ${path}: ${error instanceof Error ? error.message : error}`);
      }
      reports.push({
        ...result,
        summary: validateSummary(value, path, provider, version),
        markdown: `docs/test-results/${provider}/${version}/test-result.md`,
      });
    }
    if (!reports.length) throw new Error("No raw report snapshots found in src/generated");
    return reports;
  } catch (error) {
    throw new Error(
      `Reports require valid generated tests/results snapshots. Run deno task e2e to create them. ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
}
