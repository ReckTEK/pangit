const root = new URL("../../", import.meta.url);

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

async function markdownFiles(directory: URL): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name, directory);
    if (entry.isDirectory) files.push(...await markdownFiles(new URL(`${entry.name}/`, directory)));
    else if (entry.name.endsWith(".md")) files.push(url);
  }
  return files;
}

function markdownLinks(source: string): { label: string; target: string }[] {
  const prose = source.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, "");
  return [...prose.matchAll(/\[([^\]]*)\]\(([^)]+)\)/g)].map((match) => ({
    label: match[1],
    target: match[2].split(' "', 1)[0].replace(/^<|>$/g, ""),
  }));
}

Deno.test("authored documentation links resolve to repository files", async () => {
  const files = [
    ...[
      "README.md",
      "CONTRIBUTING.md",
      "codegen/README.md",
      "packages/pangit/README.md",
      "packages/pangit-site/Development.md",
    ].map((path) => new URL(path, root)),
    ...await markdownFiles(new URL("packages/pangit/docs/", root)),
    ...await markdownFiles(new URL("tests/e2e/hand-written/diagnostics/", root)),
  ];
  for (const file of files) {
    for (const { target } of markdownLinks(await Deno.readTextFile(file))) {
      const url = target.startsWith("https://github.com/mannsion/pangit/blob/main/")
        ? new URL(target.slice("https://github.com/mannsion/pangit/blob/main/".length), root)
        : new URL(target, file);
      if (url.protocol !== "file:") continue;
      url.hash = "";
      assert(
        url.href.startsWith(root.href),
        `${file.pathname} links outside the repository: ${target}`,
      );
      try {
        await Deno.stat(url);
      } catch (error) {
        throw new Error(`${file.pathname} has a broken link: ${target}`, { cause: error });
      }
    }
  }
});

Deno.test("README passing E2E claims match the recorded complete-run evidence", async () => {
  const links = markdownLinks(await Deno.readTextFile(new URL("README.md", root)));
  const claims = links.filter(({ label, target }) =>
    label.startsWith("Pass:") && target.startsWith("tests/e2e/results/")
  );
  assert(claims.length > 0, "README has no verifiable passing E2E claims");
  for (const { label, target } of claims) {
    const summary = JSON.parse(await Deno.readTextFile(new URL(target, root)));
    assert(
      summary.passed && summary.selection.suite === "all",
      `${target} is not a passing full run`,
    );
    const fluent = /^Pass: ([\d,]+) contracts$/.exec(label);
    const raw = /^Pass: ([\d,]+)\/([\d,]+)$/.exec(label);
    const count = (value: string) => Number(value.replaceAll(",", ""));
    if (fluent) {
      const evidence = summary.handWrittenFluentApiContracts;
      assert(
        evidence?.passed && evidence.contracts.length === count(fluent[1]) &&
          evidence.contracts.every((contract: { passed: boolean }) => contract.passed),
        `${label} disagrees with ${target}`,
      );
    } else {
      assert(raw, `Unrecognized E2E claim: ${label}`);
      assert(
        summary.suites.generatedRawRestClientTest.passed &&
          summary.endpoints.passed === count(raw[1]) &&
          summary.endpoints.operations === count(raw[2]),
        `${label} disagrees with ${target}`,
      );
    }
    for (const suite of Object.values(summary.suites) as { log: string; junit: string }[]) {
      await Deno.stat(new URL(suite.log, new URL(target, root)));
      await Deno.stat(new URL(suite.junit, new URL(target, root)));
    }
  }
});
