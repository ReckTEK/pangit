const startMarker = "<!-- BEGIN GENERATED TEST RESULTS -->";
const endMarker = "<!-- END GENERATED TEST RESULTS -->";

type Summary = {
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
  sourceCoverage: { lines: { total: number; covered: number; percent: number } };
};

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validateSummary(value: unknown, provider: string, version: string): Summary {
  const summary = value as Summary | null;
  const endpoints = summary?.endpoints;
  const lines = summary?.sourceCoverage?.lines;
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
    (summary.passed &&
      (endpoints.passed !== endpoints.operations || endpoints.missing !== 0 ||
        endpoints.failedCases !== 0)) ||
    !lines || !isCount(lines.total) || !isCount(lines.covered) || lines.covered > lines.total ||
    lines.percent !==
      (lines.total === 0 ? 100 : Number((100 * lines.covered / lines.total).toFixed(2)))
  ) {
    throw new Error(
      `Invalid report summary: docs/test-results/${provider}/${version}/summary.json`,
    );
  }
  return summary;
}

async function directories(path: URL): Promise<string[]> {
  const names: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    if (!entry.isDirectory) continue;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(entry.name)) {
      throw new Error(`Invalid report directory name: ${entry.name}`);
    }
    names.push(entry.name);
  }
  return names.sort();
}

export async function generateReadme(root = new URL("../", import.meta.url)): Promise<void> {
  const readmePath = new URL("README.md", root);
  const readme = await Deno.readTextFile(readmePath);
  const start = readme.indexOf(startMarker);
  const end = readme.indexOf(endMarker);
  if (
    start < 0 || end < start + startMarker.length ||
    readme.indexOf(startMarker, start + 1) !== -1 || readme.indexOf(endMarker, end + 1) !== -1
  ) {
    throw new Error(
      `README.md must contain exactly one ordered pair of ${startMarker} / ${endMarker}`,
    );
  }

  const rows: string[][] = [];
  try {
    const reports = new URL("docs/test-results/", root);
    for (const provider of await directories(reports)) {
      const versions = await directories(new URL(`${provider}/`, reports));
      if (versions.length === 0) throw new Error(`No report snapshots for ${provider}`);
      for (const version of versions) {
        const path = `docs/test-results/${provider}/${version}`;
        let value: unknown;
        try {
          value = JSON.parse(await Deno.readTextFile(new URL(`${path}/summary.json`, root)));
        } catch (error) {
          throw new Error(
            `Cannot read ${path}/summary.json: ${error instanceof Error ? error.message : error}`,
          );
        }
        const summary = validateSummary(value, provider, version);
        const endpoints = summary.endpoints;
        rows.push([
          provider,
          `[${version}](${path}/index.html)`,
          summary.passed ? "Pass" : "Fail",
          String(endpoints.cases),
          `${endpoints.passed} / ${endpoints.operations}`,
          String(endpoints.negativeOnly),
          `${summary.sourceCoverage.lines.percent.toFixed(2)}%`,
        ]);
      }
    }
    if (rows.length === 0) throw new Error("No report snapshots found in docs/test-results");
  } catch (error) {
    throw new Error(
      `README results require valid docs/test-results snapshots. Run deno task e2e to create them. ${
        error instanceof Error ? error.message : error
      }`,
    );
  }

  const headings = [
    "Provider",
    "Version",
    "Result",
    "Cases",
    "Endpoints",
    "Negative-only",
    "Client lines",
  ];
  const widths = headings.map((heading, index) =>
    Math.max(heading.length, ...rows.map((row) => row[index].length))
  );
  const formatRow = (row: string[]) =>
    `| ${
      row.map((cell, index) => {
        const width = widths[index];
        if (index < 2) return cell.padEnd(width);
        if (index === 2) {
          return cell.padStart(cell.length + Math.floor((width - cell.length) / 2)).padEnd(width);
        }
        return cell.padStart(width);
      }).join(" | ")
    } |`;
  const separator = widths.map((width, index) =>
    index < 2
      ? ":" + "-".repeat(width - 1)
      : index === 2
      ? ":" + "-".repeat(width - 2) + ":"
      : "-".repeat(width - 1) + ":"
  );
  const section = [
    formatRow(headings),
    `| ${separator.join(" | ")} |`,
    ...rows.map(formatRow),
    "",
    "Endpoints count operations with passing checks, including expected errors. Negative-only operations",
    "have no successful-response test. Coverage measures generated client source, not server code or all",
    "API behaviors.",
  ].join("\n");
  const updated = `${readme.slice(0, start + startMarker.length)}\n\n${section}\n\n${
    readme.slice(end)
  }`;
  if (updated !== readme) await Deno.writeTextFile(readmePath, updated);
}

if (import.meta.main) {
  try {
    await generateReadme();
    console.log("Updated README test results from saved report snapshots.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
