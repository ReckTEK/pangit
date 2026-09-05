import type { JsonObject } from "./normalize-openapi-document.ts";

/** Match Forgejo's FormStrings parser: action filters use repeated query keys, not CSV. */
export function normalizeForgejoActionsQuery(document: JsonObject): void {
  // Verified in both v15.0.7 and v16.0.3 routers/api/v1/repo/action.go:
  // https://codeberg.org/forgejo/forgejo/src/tag/v16.0.3/routers/api/v1/repo/action.go
  const paths = document.paths as Record<string, { get?: { parameters?: JsonObject[] } }>;
  for (const [endpoint, names] of [["runs", ["event", "status"]], ["tasks", ["status"]]] as const) {
    const parameters = paths?.[`/repos/{owner}/{repo}/actions/${endpoint}`]?.get?.parameters;
    for (const name of names) {
      const parameter = parameters?.find((item) => item.in === "query" && item.name === name);
      if (!parameter || (parameter.schema as JsonObject)?.type !== "array") {
        throw new Error(
          `Forgejo actions/${endpoint} ${name} filter changed; review query encoding`,
        );
      }
      parameter.style = "form";
      parameter.explode = true;
    }
  }
}
