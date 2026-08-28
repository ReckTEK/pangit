import { generatedComment } from "./notices.ts";
import { readReportSummaries } from "./reports/model.ts";

const startMarker = "<!-- BEGIN GENERATED TEST RESULTS -->";
const endMarker = "<!-- END GENERATED TEST RESULTS -->";

export async function generateReadme(
  root: URL,
  options: { readmePath?: URL; reportPrefix?: string } = {},
): Promise<void> {
  const readmePath = options.readmePath ?? new URL("README.md", root);
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
  for (const { provider, version, summary, markdown } of await readReportSummaries(root)) {
    const endpoints = summary.endpoints;
    rows.push([
      provider,
      `[${version}](${options.reportPrefix ?? ""}${markdown})`,
      summary.passed ? "Pass" : "Fail",
      String(endpoints.cases),
      `${endpoints.passed} / ${endpoints.operations}`,
      String(endpoints.negativeOnly),
      `${summary.sourceCoverage.lines.percent.toFixed(2)}%`,
    ]);
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
    generatedComment("<!--").trimEnd(),
    "",
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
