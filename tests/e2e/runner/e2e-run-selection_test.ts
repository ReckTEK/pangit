import {
  type E2ERunCatalog,
  filterE2EReleases,
  includesFluentSuite,
  includesRawSuite,
  parseE2ERunSelection,
  resolveE2EResultDirectory,
  shouldPublishE2EResults,
} from "./e2e-run-selection.ts";

const catalog = {
  gitea: {
    versions: ["1.26.4", "1.27.2"],
    fluentContractIds: ["core/repositories", "native-access/gitea"],
  },
} as const satisfies E2ERunCatalog;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function rejects(args: readonly string[], message: string): void {
  let rejected = false;
  try {
    parseE2ERunSelection(args, catalog);
  } catch (error) {
    rejected = error instanceof TypeError;
  }
  assert(rejected, message);
}

Deno.test("unfiltered E2E selection runs every suite and remains publishable", () => {
  const selection = parseE2ERunSelection([], catalog);
  assert(
    selection.suite === "all",
    "Unfiltered selection did not select all suites",
  );
  assert(!selection.focused, "Unfiltered selection was marked focused");
  assert(includesRawSuite(selection.suite), "All omitted the raw suite");
  assert(includesFluentSuite(selection.suite), "All omitted the fluent suite");
});

Deno.test("focused E2E selection accepts split and equals option forms", () => {
  const selection = parseE2ERunSelection([
    "--git-host=gitea",
    "--version",
    "1.27.2",
    "--suite=fluent",
    "--contract",
    "core/repositories",
  ], catalog);
  assert(selection.gitHost === "gitea", "Git-host filter was lost");
  assert(selection.version === "1.27.2", "Version filter was lost");
  assert(selection.suite === "fluent", "Suite filter was lost");
  assert(
    selection.contract === "core/repositories",
    "Contract filter was lost",
  );
  assert(selection.focused, "Filtered selection was not marked focused");
  assert(
    !includesRawSuite(selection.suite),
    "Fluent selection included raw tests",
  );
  assert(
    includesFluentSuite(selection.suite),
    "Fluent selection omitted fluent tests",
  );
});

Deno.test("a contract filter implies the fluent suite", () => {
  const selection = parseE2ERunSelection([
    "--git-host",
    "gitea",
    "--contract",
    "native-access/gitea",
  ], catalog);
  assert(
    selection.suite === "fluent",
    "Contract selection did not imply fluent suite",
  );
});

Deno.test("E2E filters reject unknown, duplicate, missing, and incompatible values", () => {
  rejects(["--wat", "gitea"], "Unknown flag was accepted");
  rejects(["--git-host"], "Missing flag value was accepted");
  rejects(["--suite", "wat"], "Unknown suite was accepted");
  rejects(["--git-host", "github"], "Unknown Git host was accepted");
  rejects(["--version", "0.0.0"], "Unknown version was accepted");
  rejects(
    ["--git-host", "gitea", "--git-host", "gitea"],
    "Duplicate flag was accepted",
  );
  rejects(
    ["--suite", "raw", "--contract", "core/repositories"],
    "Raw suite accepted a fluent contract",
  );
  rejects(
    ["--suite", "fluent", "--contract", "core/not-real"],
    "Unknown fluent contract was accepted",
  );
});

Deno.test("release filtering retains only the requested host and version", () => {
  const releases = [
    { gitHost: "gitea", version: "1.26.4" },
    { gitHost: "gitea", version: "1.27.2" },
  ];
  const selection = parseE2ERunSelection([
    "--git-host",
    "gitea",
    "--version",
    "1.26.4",
    "--suite",
    "raw",
  ], catalog);
  const selected = filterE2EReleases(releases, selection);
  assert(
    selected.length === 1,
    "Version filter selected the wrong release count",
  );
  assert(
    selected[0].version === "1.26.4",
    "Version filter selected the wrong release",
  );
});

Deno.test("focused results are isolated and only an unfiltered run publishes", () => {
  const root = new URL("file:///workspace/");
  const release = {
    gitHost: "gitea",
    version: "1.27.2",
    results: new URL("tests/e2e/results/gitea/1.27.2/", root),
  };
  const full = parseE2ERunSelection([], catalog);
  const focused = parseE2ERunSelection(["--suite", "raw"], catalog);
  assert(
    resolveE2EResultDirectory(root, release, full) === release.results,
    "Full result directory was redirected",
  );
  assert(
    resolveE2EResultDirectory(root, release, focused).pathname ===
      "/workspace/tests/e2e/.focused-results/gitea/1.27.2/",
    "Focused result directory was not isolated",
  );
  assert(
    shouldPublishE2EResults(full),
    "Unfiltered run was made non-publishing",
  );
  assert(
    !shouldPublishE2EResults(focused),
    "Focused run was allowed to publish",
  );
});
