import { compareText } from "./naming.ts";

export type JsonObject = Record<string, unknown>;

export type OpenApiDocument = JsonObject & {
  openapi: string;
  info: JsonObject;
  paths: Record<string, JsonObject>;
  components?: JsonObject;
  servers?: unknown[];
};

export const httpMethods = ["delete", "get", "head", "options", "patch", "post", "put"] as const;
export type OpenApiHttpMethod = (typeof httpMethods)[number];

export function parseOpenApiDocument(text: string, source: string): OpenApiDocument {
  const value: unknown = JSON.parse(text);
  if (
    !isObject(value) || value.openapi !== "3.0.3" || !isObject(value.info) || !isObject(value.paths)
  ) {
    throw new Error(`${source} is not a normalized OpenAPI 3.0.3 document`);
  }
  return value as OpenApiDocument;
}

export function isObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function asObject(value: unknown): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

export function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function objectEntries(value: unknown): [string, unknown][] {
  return isObject(value)
    ? Object.entries(value).toSorted(([left], [right]) => compareText(left, right))
    : [];
}

export function componentSchemas(document: OpenApiDocument): ReadonlyMap<string, JsonObject> {
  const schemas = asObject(document.components)?.schemas;
  return new Map(
    objectEntries(schemas)
      .filter((entry): entry is [string, JsonObject] => isObject(entry[1])),
  );
}

export function resolveObject(document: OpenApiDocument, value: unknown): JsonObject | undefined {
  let current = asObject(value);
  const visited = new Set<string>();
  while (current !== undefined && typeof current.$ref === "string") {
    if (visited.has(current.$ref)) {
      throw new Error(`Circular non-schema reference ${current.$ref}`);
    }
    visited.add(current.$ref);
    current = asObject(resolveLocalReference(document, current.$ref));
  }
  return current;
}

export function resolveLocalReference(document: OpenApiDocument, reference: string): unknown {
  if (!reference.startsWith("#/")) {
    throw new Error(`External OpenAPI reference is unsupported: ${reference}`);
  }
  let value: unknown = document;
  for (const token of reference.slice(2).split("/")) {
    if (!isObject(value)) {
      throw new Error(`OpenAPI reference does not resolve: ${reference}`);
    }
    value = value[token.replaceAll("~1", "/").replaceAll("~0", "~")];
  }
  if (value === undefined) {
    throw new Error(`OpenAPI reference does not resolve: ${reference}`);
  }
  return value;
}

export function referenceName(reference: string): string | undefined {
  const prefix = "#/components/schemas/";
  return reference.startsWith(prefix)
    ? reference.slice(prefix.length).replaceAll("~1", "/").replaceAll("~0", "~")
    : undefined;
}

export function firstServerUrl(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const server of value) {
    const url = asString(asObject(server)?.url);
    if (url !== undefined) return url;
  }
  return undefined;
}
