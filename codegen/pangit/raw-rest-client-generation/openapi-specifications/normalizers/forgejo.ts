import { type JsonObject, normalizeSwagger2 } from "./normalize-openapi-document.ts";
import { normalizeForgejoActionsQuery } from "./forgejo-actions-query.ts";

export function normalizeForgejo(version: string): Promise<void> {
  return normalizeSwagger2("forgejo", version, (document) => {
    includeObservedResponses(document);
    normalizeForgejoActionsQuery(document);
  });
}

/** Correct responses confirmed by live contracts and the release's API handlers. */
export function includeObservedResponses(document: JsonObject): void {
  // repo.MergePullRequest returns 201 when an automatic merge is scheduled.
  const merge = objectAt(
    document,
    "paths",
    "/repos/{owner}/{repo}/pulls/{index}/merge",
    "post",
    "responses",
  );
  if (merge["200"] === undefined) throw new Error("Forgejo merge response is missing");
  merge["201"] ??= structuredClone(merge["200"]);

  // Non-forks and repositories without a transfer return explicit null, not absent fields.
  const properties = objectAt(document, "components", "schemas", "Repository", "properties");
  for (const field of ["parent", "repo_transfer"]) {
    const schema = objectAt(properties, field);
    if (typeof schema.$ref !== "string") {
      throw new Error(`Forgejo Repository.${field} reference changed; review nullable mapping`);
    }
    properties[field] = { nullable: true, allOf: [schema] };
  }

  // repo.GetContents returns either one file or the requested directory's entries.
  const response = objectAt(
    document,
    "paths",
    "/repos/{owner}/{repo}/contents/{filepath}",
    "get",
    "responses",
  );
  if (objectAt(response, "200").$ref !== "#/components/responses/ContentsResponse") {
    throw new Error("Forgejo contents response changed; review the directory union");
  }
  response["200"] = {
    description: "File content or directory entries",
    content: {
      "application/json": {
        schema: {
          oneOf: [
            { $ref: "#/components/schemas/ContentsResponse" },
            { type: "array", items: { $ref: "#/components/schemas/ContentsResponse" } },
          ],
        },
      },
    },
  };
}

function objectAt(root: JsonObject, ...path: string[]): JsonObject {
  let value: unknown = root;
  for (const part of path) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Forgejo OpenAPI path ${path.join(" -> ")} is missing`);
    }
    value = (value as JsonObject)[part];
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Forgejo OpenAPI path ${path.join(" -> ")} is not an object`);
  }
  return value as JsonObject;
}
