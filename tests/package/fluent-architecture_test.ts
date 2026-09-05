const sourceRoot = new URL("../../packages/pangit/src/", import.meta.url);
const projectRoot = new URL("../../", import.meta.url);

async function sourceFiles(directory: URL, includeTests = false): Promise<URL[]> {
  const files: URL[] = [];
  for await (const entry of Deno.readDir(directory)) {
    const url = new URL(entry.name, directory);
    if (entry.isDirectory) {
      files.push(...await sourceFiles(new URL(`${entry.name}/`, directory), includeTests));
    } else if (entry.name.endsWith(".ts") && (includeTests || !entry.name.endsWith("_test.ts"))) {
      files.push(url);
    }
  }
  return files;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("universal fluent code cannot import or name concrete providers", async () => {
  const files = await sourceFiles(new URL("fluent-api/", sourceRoot), true);
  for (const file of files) {
    const source = await Deno.readTextFile(file);
    assert(
      !/\b(?:Gitea|GitLab|GitHub|Forgejo|Bitbucket|Codeberg|AzureDevOps)\w*|\b(?:gitea|gitlab|github|forgejo|bitbucket|azure-devops|codeberg)(?:[A-Z]\w*|\b)/
        .test(source),
      `${file.pathname} contains concrete provider policy`,
    );
    for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)) {
      const dependency = new URL(match[1], file).pathname;
      assert(
        !dependency.includes("/fluent-providers/") && !dependency.includes("/fluent-client/"),
        `${file.pathname} depends on a concrete implementation or its catalog`,
      );
      assert(
        !dependency.includes("/generated-rest-clients/") || dependency.includes("/runtime/"),
        `${file.pathname} depends on the generated provider catalog`,
      );
    }
  }
});

Deno.test("standalone providers cannot import each other", async () => {
  const providers = new URL("fluent-providers/", sourceRoot);
  for await (const provider of Deno.readDir(providers)) {
    if (!provider.isDirectory) continue;
    const directory = new URL(`${provider.name}/`, providers);
    for (const file of await sourceFiles(directory)) {
      const source = await Deno.readTextFile(file);
      for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)) {
        const target = new URL(match[1], file);
        assert(
          !target.href.startsWith(providers.href) || target.href.startsWith(directory.href),
          `${file.pathname} imports another fluent provider: ${match[1]}`,
        );
        const generated = new URL("generated-rest-clients/", sourceRoot);
        if (target.href.startsWith(generated.href)) {
          const path = target.href.slice(generated.href.length);
          assert(
            path.startsWith(`${provider.name}/`) || path.startsWith("runtime/") ||
              path === "client-options.ts",
            `${file.pathname} imports a foreign REST catalog: ${path}`,
          );
        }
      }
    }
  }
});

Deno.test("shared E2E contracts contain no concrete provider policy", async () => {
  const shared = new URL("tests/e2e/hand-written/fluent-api-contracts/", projectRoot);
  for (const file of await sourceFiles(shared, true)) {
    const source = await Deno.readTextFile(file);
    assert(
      !/\b(?:Gitea|GitLab|GitHub|Forgejo|Bitbucket|Codeberg|AzureDevOps)\w*|\b(?:gitea|gitlab|github|forgejo|bitbucket|azure-devops|codeberg)\b/
        .test(source),
      `${file.pathname} contains provider-specific test behavior`,
    );
    for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)) {
      const dependency = new URL(match[1], file).pathname;
      assert(
        !dependency.includes("/git-host-adapter-tests/") &&
          !dependency.includes("/fluent-providers/"),
        `${file.pathname} depends on a concrete provider`,
      );
    }
  }
});

Deno.test("provider E2E implementations cannot import another provider's tests", async () => {
  const providers = new URL("tests/e2e/hand-written/git-host-adapter-tests/", projectRoot);
  for await (const provider of Deno.readDir(providers)) {
    if (!provider.isDirectory) continue;
    const directory = new URL(`${provider.name}/`, providers);
    for (const file of await sourceFiles(directory, true)) {
      const source = await Deno.readTextFile(file);
      for (const match of source.matchAll(/\b(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g)) {
        const target = new URL(match[1], file);
        assert(
          !target.href.startsWith(providers.href) || target.href.startsWith(directory.href),
          `${file.pathname} imports another provider's E2E implementation: ${match[1]}`,
        );
      }
    }
  }
});

Deno.test("provider implementations remain bounded concern modules", async () => {
  for (const file of await sourceFiles(new URL("fluent-providers/", sourceRoot))) {
    const lines = (await Deno.readTextFile(file)).split("\n").length;
    assert(
      lines <= 400,
      `${file.pathname} has ${lines} lines; split by operation or responsibility`,
    );
  }
});

Deno.test("fluent implementations have no static runtime import cycles", async () => {
  const entry = new URL("fluent-client/mod.ts", sourceRoot).href;
  const result = await new Deno.Command(Deno.execPath(), {
    cwd: projectRoot,
    args: ["info", "--json", entry],
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(result.success, new TextDecoder().decode(result.stderr));
  const report = JSON.parse(new TextDecoder().decode(result.stdout)) as {
    modules: {
      specifier: string;
      dependencies?: { code?: { specifier: string }; isDynamic?: boolean }[];
    }[];
  };
  const graph = new Map(
    report.modules.filter(({ specifier }) =>
      specifier.startsWith(sourceRoot.href) && !specifier.includes("/generated-rest-clients/")
    ).map(({ specifier, dependencies = [] }) => [
      specifier,
      dependencies.flatMap((dependency) =>
        dependency.code && !dependency.isDynamic ? [dependency.code.specifier] : []
      ),
    ]),
  );
  assert(graph.has(entry), "Module graph omitted the public fluent entry point");
  const visited = new Set<string>();
  const active = new Set<string>();
  const path: string[] = [];
  const visit = (module: string): void => {
    assert(
      !active.has(module),
      `Static runtime import cycle: ${
        [...path, module].map((url) => url.slice(sourceRoot.href.length)).join(" -> ")
      }`,
    );
    if (visited.has(module) || !graph.has(module)) return;
    active.add(module);
    path.push(module);
    for (const dependency of graph.get(module)!) visit(dependency);
    path.pop();
    active.delete(module);
    visited.add(module);
  };
  for (const module of graph.keys()) visit(module);
});

/** Capture the modules actually evaluated in a fresh process, including dynamic imports. */
async function evaluatedModules(code: string): Promise<Set<string>> {
  const temporary = await Deno.makeTempDir({ prefix: "pangit-loading-" });
  try {
    const test = `${temporary}/loading_test.ts`;
    const coverage = `${temporary}/coverage`;
    await Deno.writeTextFile(
      test,
      `Deno.test("load selected modules", async () => { ${code} });\n`,
    );
    const result = await new Deno.Command(Deno.execPath(), {
      cwd: projectRoot,
      args: [
        "test",
        "--no-check",
        `--config=${new URL("deno.json", projectRoot).pathname}`,
        `--coverage=${coverage}`,
        test,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assert(
      result.success,
      new TextDecoder().decode(result.stdout) +
        new TextDecoder().decode(result.stderr),
    );
    const urls = new Set<string>();
    for await (const entry of Deno.readDir(coverage)) {
      if (!entry.name.endsWith(".json")) continue;
      const profile = JSON.parse(await Deno.readTextFile(`${coverage}/${entry.name}`));
      if (typeof profile.url === "string") urls.add(profile.url);
    }
    assert(urls.size > 0, "Coverage did not record evaluated modules");
    return urls;
  } finally {
    await Deno.remove(temporary, { recursive: true });
  }
}

Deno.test("importing the public catalog evaluates no provider implementation", async () => {
  const entry = new URL("fluent-client/mod.ts", sourceRoot).href;
  const modules = await evaluatedModules(`await import(${JSON.stringify(entry)});`);
  assert(
    ![...modules].some((url) => url.includes("/fluent-providers/")),
    "The catalog eagerly evaluated a provider implementation",
  );
  assert(
    ![...modules].some((url) => /\/generated-rest-clients\/(?!runtime\/)/.test(url)),
    "The catalog eagerly evaluated a generated provider client",
  );
});

for (
  const [provider, versions] of Object.entries({
    gitea: ["1.26.4", "1.27.2"],
    forgejo: ["15.0.7", "16.0.3"],
    gitlab: ["18.11.11", "19.3.1"],
  })
) {
  Deno.test(`${provider} selection loads its implementation before any generated version`, async () => {
    const entry = new URL("fluent-client/mod.ts", sourceRoot).href;
    const modules = await evaluatedModules(`
      const { createClient } = await import(${JSON.stringify(entry)});
      await createClient(${JSON.stringify(provider)}, ${
      JSON.stringify(versions[0])
    }, "https://host.invalid");
    `);
    assert(
      [...modules].some((url) => url.includes(`/fluent-providers/${provider}/`)),
      "The selected implementation was not evaluated",
    );
    assert(
      ![...modules].some((url) =>
        url.includes("/fluent-providers/") &&
        !url.includes(`/fluent-providers/${provider}/`)
      ),
      "A foreign provider was evaluated",
    );
    assert(
      ![...modules].some((url) => /\/generated-rest-clients\/(?!runtime\/)/.test(url)),
      "Constructing the fluent client eagerly evaluated a generated version",
    );
  });
  for (const version of versions) {
    Deno.test(`${provider} ${version} native access evaluates only that generated version`, async () => {
      const entry = new URL("fluent-client/mod.ts", sourceRoot).href;
      const modules = await evaluatedModules(`
        const { createClient } = await import(${JSON.stringify(entry)});
        const client = await createClient(${JSON.stringify(provider)}, ${
        JSON.stringify(version)
      }, "https://host.invalid");
        await client.native[${
        JSON.stringify(provider)
      }](({ client }) => { if (!client) throw new Error("Missing raw client"); });
      `);
      const loaded = [...modules].filter((url) =>
        /\/generated-rest-clients\/(?!runtime\/)/.test(url)
      );
      assert(loaded.length > 0, "Native access did not load its generated client");
      assert(
        loaded.every((url) => url.includes(`/generated-rest-clients/${provider}/${version}/`)),
        `Native access loaded an unselected provider/version: ${loaded.join(", ")}`,
      );
      assert(
        ![...modules].some((url) =>
          url.includes("/fluent-providers/") &&
          !url.includes(`/fluent-providers/${provider}/`)
        ),
        "Native access loaded another fluent provider",
      );
    });
  }
}
