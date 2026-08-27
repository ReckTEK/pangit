import { endpointMarkdown, generateReports } from "./generate.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

const html =
  `<html><head><title>runtime title</title><style>runtime CSS</style></head><body><h1>runtime heading</h1><p>runtime timestamp</p><div class="cards">old counters</div><p><a href="coverage/index.html">HTML navigation</a></p><table><thead><tr><th>Result</th><th>Endpoint</th><th>Real responses and assertions</th></tr></thead><tbody><tr><td>PASS</td><td>GET /items<small>getItems</small></td><td>200: first<br>200: second</td></tr><tr><td>NEGATIVE</td><td>GET /absent<small>getAbsent</small></td><td>404: expected<pre>error | detail\nsecond line</pre></td></tr></tbody></table></body></html>`;

async function fixture(run: (root: URL, raw: URL) => Promise<void>): Promise<void> {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".report-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  const raw = new URL("src/generated/provider/1.0.0/tests/results/", root);
  try {
    await Deno.mkdir(raw, { recursive: true });
    const totals = {
      operations: 2,
      passed: 2,
      positive: 1,
      negativeOnly: 1,
      missing: 0,
      failedCases: 0,
      cases: 3,
    };
    const identity = { provider: "provider", version: "1.0.0", kind: "real-http-e2e" };
    await Deno.writeTextFile(
      new URL("summary.json", raw),
      JSON.stringify({
        ...identity,
        passed: true,
        endpoints: totals,
        sourceCoverage: {
          lines: { total: 100, covered: 95, percent: 95 },
          branches: { total: 2, covered: 2, percent: 100 },
          functions: { total: 5, covered: 4, percent: 80 },
        },
      }),
    );
    await Deno.writeTextFile(
      new URL("endpoint-coverage.json", raw),
      JSON.stringify({
        ...identity,
        totals,
        endpoints: [{ id: "getItems", passed: true, positive: true }, {
          id: "getAbsent",
          passed: true,
          positive: false,
        }],
      }),
    );
    await Deno.writeTextFile(new URL("index.html", raw), html);
    await run(root, raw);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
}

Deno.test("HTML endpoint conversion retains every case in GitHub Markdown table rows", () => {
  const markdown = endpointMarkdown(html);
  assert(
    markdown.split("\n").filter((line) => line.startsWith("|")).length === 4,
    "Multiline cases broke table rows",
  );
  assert(markdown.includes("GET /items — getItems"), "Endpoint ID was merged into path");
  assert(markdown.includes("200: first; 200: second"), "Repeated cases lost");
  assert(markdown.includes("error \\| detail second line"), "Error text or table escaping lost");
  assert(
    !/runtime|old counters|\.html|<table|<style/.test(markdown),
    "HTML chrome leaked into Markdown",
  );
});

Deno.test("Markdown publishing is deterministic, evidence-preserving, and Markdown-only", async () => {
  await fixture(async (root, raw) => {
    await generateReports(root);
    const report = new URL("docs/test-results/provider/1.0.0/test-result.md", root);
    const first = await Deno.readTextFile(report);
    assert(first.includes("2/2 endpoints passed"), "Endpoint totals missing");
    assert(first.includes("95.00%") && first.includes("80.00%"), "Measured coverage missing");
    assert(first.includes("- `getAbsent`"), "Negative-only operation hidden");
    assert(!first.includes(".html"), "Published report requires raw HTML");
    await generateReports(root);
    assert(await Deno.readTextFile(report) === first, "Repeated publishing changed Markdown");
    assert(await Deno.readTextFile(new URL("index.html", raw)) === html, "Raw report changed");
    const files = [];
    for await (const entry of Deno.readDir(new URL("./", report))) files.push(entry.name);
    assert(
      JSON.stringify(files) === '["test-result.md"]',
      "Raw/scaffolding files copied into docs",
    );

    await Deno.writeTextFile(
      new URL("index.html", raw),
      "<table><tr><td>incomplete</td></tr></table>",
    );
    let failed = false;
    try {
      await generateReports(root);
    } catch {
      failed = true;
    }
    assert(failed, "Incomplete HTML should fail publishing");
    assert(
      await Deno.readTextFile(report) === first,
      "Invalid snapshot replaced published Markdown",
    );
  });
});

Deno.test("Markdown publisher refuses to delete unmigrated raw artifacts", async () => {
  await fixture(async (root) => {
    const legacy = new URL("docs/test-results/provider/1.0.0/test.log", root);
    await Deno.mkdir(new URL("./", legacy), { recursive: true });
    await Deno.writeTextFile(legacy, "keep evidence");
    let failed = false;
    try {
      await generateReports(root);
    } catch (error) {
      failed = error instanceof Error && error.message.includes("Move raw evidence");
    }
    assert(failed, "Unmigrated evidence was not detected");
    assert(await Deno.readTextFile(legacy) === "keep evidence", "Unmigrated evidence was deleted");
  });
});
