import { normalizeForgejoActionsQuery } from "./forgejo-actions-query.ts";

for (const release of ["forgejo/15.0.7", "forgejo/16.0.3", "codeberg/latest"]) {
  Deno.test(`${release} normalized action filters match the server's repeated query keys`, async () => {
    const document = JSON.parse(
      await Deno.readTextFile(new URL(`../normalized/${release}.json`, import.meta.url)),
    );
    for (
      const [endpoint, names] of [["runs", ["event", "status"]], ["tasks", ["status"]]] as const
    ) {
      const parameters = document.paths[`/repos/{owner}/{repo}/actions/${endpoint}`].get.parameters;
      for (const name of names) {
        const parameter = parameters.find((item: { name: string }) => item.name === name);
        if (parameter?.style !== "form" || parameter?.explode !== true) {
          throw new Error(`${endpoint}.${name} must preserve separate filter values`);
        }
      }
    }
    const before = JSON.stringify(document);
    normalizeForgejoActionsQuery(document);
    if (JSON.stringify(document) !== before) throw new Error("Query normalization is not stable");
  });
}
