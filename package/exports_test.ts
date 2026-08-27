const providerEntrypoints = [
  ["azure-devops", "AzureDevOpsRestClient"],
  ["bitbucket", "BitbucketRestClient"],
  ["codeberg", "CodebergRestClient"],
  ["gitea", "GiteaRestClient"],
  ["github", "GitHubRestClient"],
  ["gitlab", "GitLabRestClient"],
] as const;

const packageRoot = new URL("../", import.meta.url);

type DenoInfo = {
  modules: Array<{ specifier: string }>;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function moduleGraph(entrypoint: string): Promise<Set<string>> {
  const result = await new Deno.Command(Deno.execPath(), {
    args: ["info", "--json", new URL(entrypoint, packageRoot).pathname],
    stdout: "piped",
    stderr: "piped",
  }).output();

  assert(
    result.success,
    new TextDecoder().decode(result.stderr) || `deno info failed for ${entrypoint}`,
  );
  const info = JSON.parse(new TextDecoder().decode(result.stdout)) as DenoInfo;
  return new Set(info.modules.map(({ specifier }) => specifier));
}

Deno.test("public package entrypoints resolve to isolated provider graphs", async () => {
  const manifest = JSON.parse(await Deno.readTextFile(new URL("../jsr.json", import.meta.url))) as {
    exports: Record<string, string>;
  };

  assert(manifest.exports["."] === "./mod.ts", "aggregate root export changed");
  assert(manifest.exports["./rest"] === "./rest.ts", "shared REST export is missing");

  const graphs = await Promise.all(
    providerEntrypoints.map(async ([provider, clientName]) => {
      const publicEntrypoint = `./${provider}.ts`;
      assert(
        manifest.exports[`./${provider}`] === publicEntrypoint,
        `package export ./${provider} does not resolve to ${publicEntrypoint}`,
      );

      const module = await import(new URL(publicEntrypoint, packageRoot).href);
      assert(clientName in module, `${publicEntrypoint} does not export ${clientName}`);
      assert("RestClient" in module, `${publicEntrypoint} does not export RestClient`);

      return [provider, await moduleGraph(publicEntrypoint)] as const;
    }),
  );

  const generatedRoot = new URL("./src/generated/", packageRoot).href;
  for (const [provider, graph] of graphs) {
    const generatedModules = [...graph].filter((specifier) => specifier.startsWith(generatedRoot));
    const selectedProvider = new URL(`./src/generated/${provider}.ts`, packageRoot).href;
    assert(
      generatedModules.length === 1 && generatedModules[0] === selectedProvider,
      `./${provider} imported unrelated generated modules: ${generatedModules.join(", ")}`,
    );
    assert(
      graph.has(new URL("./src/rest.ts", packageRoot).href),
      `./${provider} does not include shared REST transport`,
    );
  }
});

Deno.test("shared REST entrypoint excludes generated providers", async () => {
  const graph = await moduleGraph("./rest.ts");
  const generatedRoot = new URL("./src/generated/", packageRoot).href;
  assert(
    ![...graph].some((specifier) => specifier.startsWith(generatedRoot)),
    "./rest imported a generated provider module",
  );
});
