import { providerTestArtifacts } from "../../codegen/pangit/provider-layout.ts";
import { generatedTestOwnershipMarker } from "../../codegen/pangit/tests/generated-test-tree.ts";
import type { WorkspacePaths } from "../../codegen/workspace-layout.ts";
import { e2eResultOwnershipMarker } from "../e2e-result-tree.ts";
import { renderEndpointTableMarkdown } from "./e2e-markdown-report.ts";
import {
  e2eDocumentationOwnershipMarker,
  publishE2EDocumentation,
} from "./publish-e2e-documentation.ts";

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

const html =
  `<html><head><title>runtime title</title><style>runtime CSS</style></head><body><h1>runtime heading</h1><p>runtime timestamp</p><div class="cards">old counters</div><p><a href="coverage/index.html">HTML navigation</a></p><table><thead><tr><th>Result</th><th>Endpoint</th><th>Real responses and assertions</th></tr></thead><tbody><tr><td>PASS</td><td>GET /items<small>getItems</small></td><td>200: first<br>200: second</td></tr><tr><td>NEGATIVE</td><td>GET /absent<small>getAbsent</small></td><td>404: expected<pre>error | detail\nsecond line</pre></td></tr></tbody></table></body></html>`;

async function writeJson(path: URL, value: unknown): Promise<void> {
  await Deno.mkdir(new URL("./", path), { recursive: true });
  await Deno.writeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function fixture(run: (paths: WorkspacePaths, raw: URL) => Promise<void>): Promise<void> {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".e2e-report-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  const pangit = new URL("packages/pangit/", root);
  const paths: WorkspacePaths = {
    root,
    codegen: {
      root: new URL("codegen/", root),
      pangit: new URL("codegen/pangit/", root),
      pangitSite: new URL("codegen/pangit-site/", root),
    },
    packages: { pangit, site: new URL("packages/pangit-site/", root) },
  };
  const artifacts = providerTestArtifacts("fixture", "1.0.0");
  const raw = new URL(`${artifacts.results}/`, root);
  const totals = {
    operations: 2,
    passed: 2,
    positive: 1,
    negativeOnly: 1,
    missing: 0,
    failedCases: 0,
    cases: 3,
  };
  const identity = { provider: "fixture", version: "1.0.0", kind: "real-http-e2e" };
  try {
    await writeJson(new URL("specs/raw/manifest.json", paths.codegen.pangit), {
      schemaVersion: 1,
      providers: {
        fixture: {
          client: {
            className: "FixtureRestClient",
            displayName: "Fixture",
            namespaceName: "FixtureApi",
            variablePrefix: "fixture",
          },
          testing: { manifest: "codegen/pangit/tests/maps/fixture.json" },
          versions: {
            "1.0.0": {
              containerImage: "fixture:1.0.0",
              artifacts: {
                normalized: "codegen/pangit/specs/normalized/fixture/1.0.0.json",
                client: "src/providers/fixture/1.0.0/mod.ts",
                ...artifacts,
              },
            },
          },
        },
      },
    });
    const suite = new URL(`${artifacts.tests}/`, root);
    await Deno.mkdir(suite, { recursive: true });
    await Deno.writeTextFile(new URL(".generated", suite), generatedTestOwnershipMarker);
    await Deno.writeTextFile(new URL("compose.yaml", suite), "services: {}\n");
    await writeJson(new URL("manifest.json", suite), {
      provider: "fixture",
      version: "1.0.0",
      image: "fixture:1.0.0",
      runner: { name: "e2e", results: "/results" },
      service: { name: "fixture" },
    });
    await Deno.mkdir(raw, { recursive: true });
    await Deno.writeTextFile(new URL(".generated", raw), e2eResultOwnershipMarker);
    await writeJson(new URL("summary.json", raw), {
      ...identity,
      passed: true,
      endpoints: totals,
      sourceCoverage: {
        lines: { total: 100, covered: 95, percent: 95 },
        branches: { total: 2, covered: 2, percent: 100 },
        functions: { total: 5, covered: 4, percent: 80 },
      },
    });
    await writeJson(new URL("endpoint-coverage.json", raw), {
      ...identity,
      totals,
      endpoints: [
        { id: "getItems", passed: true, positive: true },
        { id: "getAbsent", passed: true, positive: false },
      ],
    });
    await Deno.writeTextFile(new URL("index.html", raw), html);
    await Deno.writeTextFile(
      new URL("README.md", root),
      "# Fixture\n\n[1.0.0](packages/pangit/docs/test-results/fixture/1.0.0/test-result.md)\n",
    );
    await run(paths, raw);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
}

Deno.test("raw HTML conversion retains every endpoint in stable Markdown rows", () => {
  const markdown = renderEndpointTableMarkdown(html);
  assert(
    markdown.split("\n").filter((line) => line.startsWith("|")).length === 4,
    "Multiline cases broke table rows",
  );
  assert(markdown.includes("GET /items — getItems"), "Endpoint ID was merged into path");
  assert(markdown.includes("200: first; 200: second"), "Repeated cases were lost");
  assert(markdown.includes("error \\| detail second line"), "Error text was not escaped");
  assert(!/runtime|old counters|\.html|<table|<style/.test(markdown), "Runtime noise leaked");
});

Deno.test("E2E documentation publication is deterministic and removes orphan output", async () => {
  await fixture(async (paths, raw) => {
    const readmePath = new URL("README.md", paths.root);
    const originalReadme = await Deno.readTextFile(readmePath);
    await publishE2EDocumentation(paths);
    const output = new URL("docs/test-results/", paths.packages.pangit);
    const report = new URL("fixture/1.0.0/test-result.md", output);
    const first = await Deno.readTextFile(report);
    assert(first.includes("Generated by `deno task e2e`"), "E2E provenance is missing");
    assert(first.includes("## Result rollup"), "Readable result rollup is missing");
    assert(first.includes("2 / 2"), "Endpoint totals are missing");
    assert(first.includes("95.00%") && first.includes("80.00%"), "Coverage is missing");
    assert(first.includes("- `getAbsent`"), "Negative-only operation is hidden");
    assert(!first.includes("runtime timestamp"), "Runtime noise entered Markdown");
    assert(
      await Deno.readTextFile(new URL(".generated", output)) ===
        e2eDocumentationOwnershipMarker,
      "Report-tree ownership marker is missing",
    );

    const orphan = new URL("obsolete/0.0.0/test-result.md", output);
    await Deno.mkdir(new URL("./", orphan), { recursive: true });
    await Deno.writeTextFile(orphan, "orphan");
    await publishE2EDocumentation(paths);
    assert(await Deno.readTextFile(report) === first, "Repeated publication changed Markdown");
    let orphanExists = true;
    try {
      await Deno.lstat(orphan);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) orphanExists = false;
      else throw error;
    }
    assert(!orphanExists, "Obsolete report survived complete-tree replacement");
    assert(await Deno.readTextFile(readmePath) === originalReadme, "Publisher rewrote README");
    assert(await Deno.readTextFile(new URL("index.html", raw)) === html, "Raw evidence changed");
  });
});

Deno.test("invalid evidence or unowned documentation cannot replace published reports", async () => {
  await fixture(async (paths, raw) => {
    await publishE2EDocumentation(paths);
    const report = new URL(
      "docs/test-results/fixture/1.0.0/test-result.md",
      paths.packages.pangit,
    );
    const first = await Deno.readTextFile(report);
    await Deno.writeTextFile(
      new URL("index.html", raw),
      "<table><tr><td>incomplete</td></tr></table>",
    );
    let rejected = false;
    try {
      await publishE2EDocumentation(paths);
    } catch {
      rejected = true;
    }
    assert(rejected, "Invalid evidence was accepted");
    assert(await Deno.readTextFile(report) === first, "Invalid evidence changed published output");
  });

  await fixture(async (paths) => {
    const human = new URL("docs/test-results/human.md", paths.packages.pangit);
    await Deno.mkdir(new URL("./", human), { recursive: true });
    await Deno.writeTextFile(human, "human content");
    let rejected = false;
    try {
      await publishE2EDocumentation(paths);
    } catch (error) {
      rejected = error instanceof Error && error.message.includes("unowned E2E documentation");
    }
    assert(rejected, "Unowned documentation was accepted");
    assert(await Deno.readTextFile(human) === "human content", "Unowned documentation changed");
  });
});
