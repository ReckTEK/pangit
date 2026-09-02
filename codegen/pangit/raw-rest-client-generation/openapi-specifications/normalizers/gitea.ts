import {
  type JsonObject,
  normalizeOpenApi3,
  normalizeSwagger2,
} from "./normalize-openapi-document.ts";

export function normalizeGitea(version: string): Promise<void> {
  if (version === "1.26.4") {
    return normalizeSwagger2("gitea", version, includeObservedSuccessStatuses);
  }
  return normalizeOpenApi3("gitea", version, includeObservedSuccessStatuses, {
    escapeHtml: true,
    trailingNewline: false,
  });
}

/** Both supported releases emit successful statuses omitted by their published schemas. */
function includeObservedSuccessStatuses(document: JsonObject): void {
  includeObservedCreatedStatus(
    document,
    "/repos/{owner}/{repo}/tags",
    "Gitea repoCreateTag",
  );
  includeObservedCreatedStatus(
    document,
    "/repos/{owner}/{repo}/pulls/{index}/merge",
    "Gitea repoMergePullRequest",
  );
}

function includeObservedCreatedStatus(
  document: JsonObject,
  path: string,
  operation: string,
): void {
  const responses = objectAt(
    document,
    "paths",
    path,
    "post",
    "responses",
  );
  const documented = responses["200"];
  if (documented === undefined) {
    throw new Error(`${operation} has no documented HTTP 200 response to normalize`);
  }
  responses["201"] ??= structuredClone(documented);
}

function objectAt(root: JsonObject, ...path: readonly string[]): JsonObject {
  let value: unknown = root;
  for (const part of path) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Gitea OpenAPI path ${path.join(" -> ")} is missing`);
    }
    value = (value as JsonObject)[part];
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Gitea OpenAPI path ${path.join(" -> ")} is not an object`);
  }
  return value as JsonObject;
}
