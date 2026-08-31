import {
  createPanGitSiteGenerationPhases,
  type PanGitSiteGenerationDependencies,
} from "./pangit-site-generator.ts";

Deno.test("PanGit site generation runs only site-owned work in dependency order", async () => {
  const calls: string[] = [];
  const record = (name: string) => () => {
    calls.push(name);
    return Promise.resolve();
  };
  const dependencies: PanGitSiteGenerationDependencies = {
    generateDocumentation: record("generate-documentation"),
    generateSiteAssets: record("generate-static-assets"),
    generateRouteTypes: record("generate-route-types"),
  };

  for (const phase of createPanGitSiteGenerationPhases(dependencies)) await phase.run();

  const expected = [
    "generate-documentation",
    "generate-static-assets",
    "generate-route-types",
  ];
  if (JSON.stringify(calls) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(calls)}`);
  }
});
