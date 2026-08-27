import { generateReadme } from "./readme.ts";

const before = "# Human overview\n\nKeep **this** exact.\n\n<!-- BEGIN GENERATED TEST RESULTS -->";
const after = "<!-- END GENERATED TEST RESULTS -->\n\n## Human footer\n\nKeep this too.\n";
const original = `${before}\nold generated content\n${after}`;

async function withFixture(run: (root: URL) => Promise<void>): Promise<void> {
  const directory = await Deno.makeTempDir({ dir: "codegen", prefix: ".readme-test-" });
  const root = new URL(`file://${Deno.cwd()}/${directory}/`);
  try {
    await Deno.writeTextFile(new URL("README.md", root), original);
    await run(root);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
}

function summary(provider = "gitea", version = "1.0.0") {
  return {
    provider,
    version,
    kind: "real-http-e2e",
    passed: true,
    endpoints: {
      operations: 2,
      passed: 2,
      positive: 1,
      negativeOnly: 1,
      missing: 0,
      failedCases: 0,
      cases: 3,
    },
    sourceCoverage: {
      lines: { total: 100, covered: 95, percent: 95 },
      branches: { total: 2, covered: 2, percent: 100 },
      functions: { total: 5, covered: 5, percent: 100 },
    },
  };
}

async function snapshot(root: URL, provider = "gitea", version = "1.0.0"): Promise<URL> {
  const path = new URL(`src/generated/${provider}/${version}/tests/results/`, root);
  await Deno.mkdir(path, { recursive: true });
  await Deno.writeTextFile(
    new URL("summary.json", path),
    JSON.stringify(summary(provider, version)),
  );
  return path;
}

function assert(value: boolean, message: string): void {
  if (!value) throw new Error(message);
}

async function rejectsUnchanged(root: URL, message: string): Promise<void> {
  const previous = await Deno.readTextFile(new URL("README.md", root));
  let rejected = false;
  try {
    await generateReadme(root);
  } catch (error) {
    rejected = error instanceof Error && error.message.includes(message);
    if (!rejected) throw error;
  }
  assert(rejected, `Expected rejection containing ${message}`);
  assert(
    await Deno.readTextFile(new URL("README.md", root)) === previous,
    "README changed on failure",
  );
}

Deno.test("README results are ordered, repeatable, and preserve human content without runtime noise", async () => {
  await withFixture(async (root) => {
    await snapshot(root, "zeta", "latest");
    const path = await snapshot(root, "gitea", "1.1.0");
    await snapshot(root, "gitea", "1.0.0");
    await generateReadme(root);
    const first = await Deno.readTextFile(new URL("README.md", root));
    assert(first.startsWith(before) && first.endsWith(after), "Human text changed");
    assert(first.indexOf("1.0.0") < first.indexOf("1.1.0"), "Versions are not sorted");
    assert(first.indexOf("1.1.0") < first.indexOf("latest"), "Providers are not sorted");
    assert(
      /\|\s+Pass\s+\|\s+3\s+\|\s+2 \/ 2\s+\|\s+1\s+\|/.test(first),
      "Actual summary counts missing",
    );
    assert(first.includes("95.00%"), "Inline client line coverage missing");
    assert(!first.includes("[95.00%]"), "Coverage value should remain plain inline text");
    for (
      const [provider, version] of [["gitea", "1.0.0"], ["gitea", "1.1.0"], ["zeta", "latest"]]
    ) {
      assert(
        first.includes(`[${version}](docs/test-results/${provider}/${version}/test-result.md)`),
        `Missing relative full-report link for ${provider}/${version}`,
      );
    }
    assert(first.includes("have no successful-response test"), "Negative-only caveat missing");

    await generateReadme(root);
    assert(await Deno.readTextFile(new URL("README.md", root)) === first, "Repeat changed README");
    const noisy = summary("gitea", "1.1.0");
    await Deno.writeTextFile(
      new URL("summary.json", path),
      JSON.stringify(
        {
          ...noisy,
          endpoints: { ...noisy.endpoints, requests: 123456 },
          timestamp: "runtime timestamp must not render",
          duration: 999,
        },
        null,
        4,
      ),
    );
    await generateReadme(root);
    assert(
      await Deno.readTextFile(new URL("README.md", root)) === first,
      "Runtime noise changed README",
    );
  });
});

Deno.test("README generation rejects missing reports without changing the README", async () => {
  await withFixture(async (root) => {
    await rejectsUnchanged(root, "Run deno task e2e");
    await Deno.mkdir(new URL("src/generated/", root), { recursive: true });
    await rejectsUnchanged(root, "No raw report snapshots found");
    await Deno.mkdir(new URL("src/generated/gitea/1.0.0/tests/results/", root), {
      recursive: true,
    });
    await rejectsUnchanged(
      root,
      "Cannot read src/generated/gitea/1.0.0/tests/results/summary.json",
    );
  });
});

Deno.test("README generation rejects invalid summaries", async () => {
  await withFixture(async (root) => {
    const path = await snapshot(root);
    const valid = summary();
    for (
      const invalid of [
        null,
        { ...valid, provider: "other" },
        { ...valid, version: "other" },
        { ...valid, kind: "mock" },
        { ...valid, endpoints: { ...valid.endpoints, cases: -1 } },
        { ...valid, endpoints: { ...valid.endpoints, negativeOnly: 0 } },
        { ...valid, endpoints: { ...valid.endpoints, failedCases: 1 } },
        { ...valid, sourceCoverage: { lines: { total: 100, covered: 95, percent: 100 } } },
      ]
    ) {
      await Deno.writeTextFile(new URL("summary.json", path), JSON.stringify(invalid));
      await rejectsUnchanged(root, "Invalid report summary");
    }
    await Deno.writeTextFile(new URL("summary.json", path), "invalid JSON");
    await rejectsUnchanged(
      root,
      "Cannot read src/generated/gitea/1.0.0/tests/results/summary.json",
    );
  });
});

Deno.test("README generation rejects missing, duplicate, or reversed section markers", async () => {
  await withFixture(async (root) => {
    for (
      const invalid of [
        "human text only",
        `${original}\n${before}`,
        `${original}\n${after}`,
        after + before,
      ]
    ) {
      await Deno.writeTextFile(new URL("README.md", root), invalid);
      await rejectsUnchanged(root, "exactly one ordered pair");
    }
  });
});

Deno.test("README results display failed runs honestly", async () => {
  await withFixture(async (root) => {
    const path = await snapshot(root);
    const failed = summary();
    failed.passed = false;
    failed.endpoints = {
      operations: 2,
      passed: 1,
      positive: 1,
      negativeOnly: 0,
      missing: 0,
      failedCases: 1,
      cases: 3,
    };
    await Deno.writeTextFile(new URL("summary.json", path), JSON.stringify(failed));
    await generateReadme(root);
    assert(
      /\|\s+Fail\s+\|\s+3\s+\|\s+1 \/ 2\s+\|\s+0\s+\|/.test(
        await Deno.readTextFile(new URL("README.md", root)),
      ),
      "Failed run hidden",
    );
  });
});
