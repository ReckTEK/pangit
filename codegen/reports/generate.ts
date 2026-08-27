// @ts-types="npm:@types/turndown@5.0.6"
import TurndownService from "turndown";

// @ts-types="./turndown-plugin-gfm.d.ts"
import { tables } from "turndown-plugin-gfm/lib/turndown-plugin-gfm.es.js";
import { readReportSummaries, type ReportSnapshot } from "./model.ts";

type Endpoint = { id: string; passed: boolean; positive: boolean };

export function endpointMarkdown(html: string): string {
  const converter = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  converter.use(tables);
  const escape = converter.escape.bind(converter);
  converter.escape = (text) => escape(text).replaceAll("|", "\\|");
  // The shared raw report template owns these navigation/summary elements; Markdown supplies its own.
  converter.addRule("reportChrome", {
    filter: (node) =>
      ["HEAD", "TITLE", "STYLE", "SCRIPT", "H1", "P"].includes(node.nodeName) ||
      (node.nodeName === "DIV" && node.getAttribute("class") === "cards"),
    replacement: () => "",
  });
  converter.addRule("operationName", {
    filter: "small",
    replacement: (content) => ` — ${content}`,
  });
  converter.addRule("cellBreak", { filter: "br", replacement: () => "; " });
  converter.addRule("cellError", {
    filter: "pre",
    replacement: (content) => ` — ${content.replace(/\s+/g, " ").trim()}`,
  });
  return converter.turndown(html).trim();
}

async function renderReport(report: ReportSnapshot): Promise<string> {
  const { provider, version, directory, summary } = report;
  const endpoint = JSON.parse(
    await Deno.readTextFile(new URL("endpoint-coverage.json", directory)),
  );
  const endpoints: Endpoint[] = endpoint.endpoints;
  if (
    endpoint.provider !== provider || endpoint.version !== version ||
    endpoint.kind !== summary.kind ||
    !Array.isArray(endpoints) || endpoints.length !== summary.endpoints.operations ||
    endpoints.some((entry) =>
      typeof entry.id !== "string" || typeof entry.passed !== "boolean" ||
      typeof entry.positive !== "boolean"
    ) ||
    new Set(endpoints.map((entry) => entry.id)).size !== endpoints.length ||
    Object.entries(summary.endpoints).some(([key, value]) => endpoint.totals?.[key] !== value) ||
    endpoints.filter((entry) => entry.passed).length !== summary.endpoints.passed ||
    endpoints.filter((entry) => entry.passed && !entry.positive).length !==
      summary.endpoints.negativeOnly
  ) throw new Error(`${provider} ${version}: endpoint map and summary disagree`);

  const converted = endpointMarkdown(await Deno.readTextFile(new URL("index.html", directory)));
  const rows = converted.split("\n").filter((line) => line.startsWith("|"));
  if (rows.length !== summary.endpoints.operations + 2) {
    throw new Error(`${provider} ${version}: converted HTML does not contain every endpoint row`);
  }
  const negativeOnly = endpoints.filter((entry) => entry.passed && !entry.positive)
    .map((entry) => entry.id).sort();
  const metrics = summary.sourceCoverage;
  const markdown = [
    `# ${provider} ${version} — real API E2E`,
    "",
    "<!-- Generated from raw E2E reports. Do not edit. -->",
    "",
    `Result: **${
      summary.passed ? "PASS" : "FAIL"
    }**. ${summary.endpoints.cases} cases; ${summary.endpoints.passed}/${summary.endpoints.operations} endpoints passed; ${summary.endpoints.failedCases} failed cases; ${summary.endpoints.missing} untested endpoints.`,
    "",
    "## Client source coverage",
    "",
    "Measured by Deno against the generated client, not the provider server.",
    "",
    "| Metric | Covered / total | Coverage |",
    "| :--- | ---: | ---: |",
    ...(["lines", "branches", "functions"] as const).map((name) =>
      `| ${name} | ${metrics[name].covered} / ${metrics[name].total} | ${
        metrics[name].percent.toFixed(2)
      }% |`
    ),
    "",
    "## Coverage boundaries",
    "",
    `${summary.endpoints.positive} operations have a passing positive-response case (HTTP 2xx/3xx). ${summary.endpoints.negativeOnly} have negative-only checks: expected errors, with no successful-response test. Endpoint coverage does not prove every successful API behavior or server implementation path.`,
    "",
    ...(negativeOnly.length
      ? negativeOnly.map((id) => `- \`${id.replaceAll("`", "\\`")}\``)
      : ["No negative-only operations."]),
    "",
    "## Endpoint results",
    "",
    "PASS = positive-response coverage; NEGATIVE = expected-error-only coverage; FAIL = a failed or missing check. Responses below came from the real provider container.",
    "",
    converted,
    "",
  ].join("\n");
  // Format only derived content, never the human-authored README sections.
  const child = new Deno.Command(Deno.execPath(), {
    args: ["fmt", "--no-config", "--line-width=100", "--ext=md", "-"],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  }).spawn();
  const writer = child.stdin.getWriter();
  await writer.write(new TextEncoder().encode(markdown));
  await writer.close();
  const output = await child.output();
  if (!output.success) throw new Error(new TextDecoder().decode(output.stderr));
  return new TextDecoder().decode(output.stdout);
}

async function existingMarkdown(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  try {
    for await (const entry of Deno.readDir(directory)) {
      const path = new URL(
        `${encodeURIComponent(entry.name)}${entry.isDirectory ? "/" : ""}`,
        directory,
      );
      if (entry.isDirectory) files.push(...await existingMarkdown(path));
      else if (entry.isFile && entry.name.endsWith(".md")) files.push(path);
      else {throw new Error(
          `Move raw evidence out of docs/test-results before publishing: ${path.pathname}`,
        );}
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  return files;
}

export async function generateReports(root = new URL("../../", import.meta.url)): Promise<void> {
  const reports = await readReportSummaries(root);
  const oldFiles = await existingMarkdown(new URL("docs/test-results/", root));
  const output = new Map<string, string>();
  // Finish reading/validating/converting every snapshot before replacing any published report.
  for (const report of reports) {
    output.set(new URL(report.markdown, root).href, await renderReport(report));
  }
  for (const [path, markdown] of output) {
    const file = new URL(path);
    await Deno.mkdir(new URL("./", file), { recursive: true });
    let previous: string | undefined;
    try {
      previous = await Deno.readTextFile(file);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    if (previous !== markdown) await Deno.writeTextFile(file, markdown);
  }
  for (const file of oldFiles) if (!output.has(file.href)) await Deno.remove(file);
  console.log(`Published ${output.size} Markdown E2E reports.`);
}

if (import.meta.main) await generateReports();
