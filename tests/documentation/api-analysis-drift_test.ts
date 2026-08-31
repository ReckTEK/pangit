const workspaceRoot = new URL("../../", import.meta.url);
const analysisRoot = new URL("packages/pangit/docs/api-analysis/", workspaceRoot);
const siteRoot = new URL("packages/pangit-site/", workspaceRoot);

type DocumentationManifest = {
  providers: Array<{
    id: string;
    selected: string;
    versions: Array<{
      version: string;
      operationCount: number;
      artifacts: { operations: string };
    }>;
  }>;
};

type DocumentationOperation = { methodName: string };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("common API analysis stays reachable and aligned with generated provider operations", async () => {
  const rootReadme = await Deno.readTextFile(new URL("README.md", workspaceRoot));
  const analysisReadme = await Deno.readTextFile(new URL("README.md", analysisRoot));
  assert(
    rootReadme.includes("packages/pangit/docs/api-analysis/README.md"),
    "Root README does not link the common API analysis",
  );
  assert(
    analysisReadme.includes("core-method-map.md"),
    "API analysis does not link its provider method map",
  );

  const manifest: DocumentationManifest = JSON.parse(
    await Deno.readTextFile(new URL("app/documentation/generated/manifest.json", siteRoot)),
  );
  const documentedCount = analysisReadme.match(/reviewed ([\d,]+)-operation snapshot/)?.[1];
  assert(documentedCount, "API analysis does not state its reviewed operation count");
  const generatedCount = manifest.providers.flatMap((provider) => provider.versions)
    .reduce((total, version) => total + version.operationCount, 0);
  assert(
    Number(documentedCount.replaceAll(",", "")) === generatedCount,
    `API analysis operation count is stale: ${documentedCount} != ${generatedCount}`,
  );

  const providerIds: Record<string, string> = {
    "Gitea": "gitea",
    "Codeberg": "codeberg",
    "GitHub": "github",
    "GitLab": "gitlab",
    "Bitbucket Cloud": "bitbucket",
    "Azure DevOps Git": "azure-devops",
  };
  const methodMap = await Deno.readTextFile(new URL("core-method-map.md", analysisRoot));
  const operationNames = new Map<string, Set<string>>();
  for (const provider of manifest.providers) {
    const selected = provider.versions.find((version) => version.version === provider.selected);
    assert(
      selected,
      `Generated documentation omits selected client ${provider.id}/${provider.selected}`,
    );
    const operations: DocumentationOperation[] = JSON.parse(
      await Deno.readTextFile(new URL(selected.artifacts.operations, siteRoot)),
    );
    operationNames.set(provider.id, new Set(operations.map((operation) => operation.methodName)));
  }

  let mappedProviderRows = 0;
  for (const match of methodMap.matchAll(/^\| \*\*([^*]+)\*\*\s+\| (.+) \|$/gm)) {
    const [, providerLabel, mapping] = match;
    const providerId = providerIds[providerLabel];
    assert(providerId, `Unknown provider in core method map: ${providerLabel}`);
    const names = [...mapping.matchAll(/`([^`]+)`/g)].map((entry) => entry[1]);
    assert(names.length > 0, `Core method map has no native method for ${providerLabel}`);
    const generated = operationNames.get(providerId);
    assert(generated, `Generated documentation omits provider ${providerId}`);
    for (const name of names) {
      assert(generated.has(name), `Stale core method mapping: ${providerLabel}.${name}`);
    }
    mappedProviderRows++;
  }
  assert(mappedProviderRows > 0, "Core method map contains no provider mappings");
});
