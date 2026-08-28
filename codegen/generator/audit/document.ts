import {
  asObject,
  asString,
  type JsonObject,
  objectEntries,
  type OpenApiDocument,
  resolveLocalReference,
} from "../openapi.ts";
import { type AuditContext, diagnostic } from "./model.ts";

/** Inspect schema and reference facts throughout the document, including unused components. */
export function auditDocumentSchemas(
  { document, provider, metrics, diagnostics }: AuditContext,
): void {
  walkObjects(document, "#", (value, pointer) => {
    if (
      value.type === "integer" && asString(value.format)?.toLowerCase() === "int64"
    ) {
      metrics.int64SchemaOccurrences++;
    }
    const reference = asString(value.$ref);
    if (reference !== undefined && !reference.startsWith("#/")) {
      metrics.externalReferenceUses++;
      diagnostics.push(diagnostic(
        provider,
        `${pointer}/$ref`,
        "external-reference",
        "reject-external-reference",
      ));
    }
    for (const lossPointer of conditionalRequiredLossPointers(value, pointer)) {
      metrics.conditionalOuterPropertyRequiredLosses++;
      diagnostics.push(diagnostic(
        provider,
        lossPointer,
        "conditional-required-loss",
        "reject-unpreserved-required-field",
      ));
    }
    for (const malformedPointer of malformedRequiredPointers(value, pointer)) {
      metrics.malformedRequiredNonObjectUses++;
      diagnostics.push(diagnostic(
        provider,
        malformedPointer,
        "malformed-required-non-object",
        "preserve-upstream-schema-diagnostic",
      ));
    }
    for (const variablePointer of serverVariablePointers(value.servers, pointer)) {
      metrics.serverVariableDeclarations++;
      diagnostics.push(diagnostic(
        provider,
        variablePointer,
        "server-variable",
        "require-explicit-server-substitution",
      ));
    }
  });
}

function conditionalRequiredLossPointers(
  schema: JsonObject,
  pointer: string,
): string[] {
  const pointers: string[] = [];
  for (const keyword of ["oneOf", "anyOf"] as const) {
    if (!Array.isArray(schema[keyword])) continue;
    for (const [branchIndex, branchValue] of schema[keyword].entries()) {
      const branch = asObject(branchValue);
      if (branch === undefined || !Array.isArray(branch.required)) continue;
      const branchProperties = asObject(branch.properties) ?? {};
      const branchSkipsInheritedProperties = asString(branch.$ref) !== undefined ||
        (Array.isArray(branch.enum) && branch.enum.length > 0) ||
        Object.hasOwn(branch, "const") ||
        branch.type === "array" ||
        branch.items !== undefined;
      for (const [requiredIndex, name] of branch.required.entries()) {
        if (
          typeof name === "string" && !Object.hasOwn(branchProperties, name) &&
          branchSkipsInheritedProperties
        ) {
          pointers.push(
            `${pointer}/${keyword}/${branchIndex}/required/${requiredIndex}`,
          );
        }
      }
    }
  }
  return pointers;
}

function malformedRequiredPointers(schema: JsonObject, pointer: string): string[] {
  if (!Array.isArray(schema.required)) return [];
  const explicitlyNonObject = schema.type === "array" || schema.items !== undefined ||
    schema.type === "string" || schema.type === "integer" || schema.type === "number" ||
    schema.type === "boolean" || schema.type === "null";
  return explicitlyNonObject ? [`${pointer}/required`] : [];
}

function serverVariablePointers(value: unknown, ownerPointer: string): string[] {
  if (!Array.isArray(value)) return [];
  const pointers: string[] = [];
  for (const [serverIndex, serverValue] of value.entries()) {
    const server = asObject(serverValue);
    if (server === undefined) continue;
    for (const [name] of objectEntries(server.variables)) {
      pointers.push(
        `${ownerPointer}/servers/${serverIndex}/variables/${pointerToken(name)}`,
      );
    }
  }
  return pointers;
}

export function pointerToken(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

export function resolveLocalObject(
  document: OpenApiDocument,
  value: unknown,
): JsonObject | undefined {
  let current = asObject(value);
  const visited = new Set<string>();
  while (current !== undefined) {
    const reference = asString(current.$ref);
    if (reference === undefined) return current;
    if (!reference.startsWith("#/")) return undefined;
    if (visited.has(reference)) {
      throw new Error(`Circular local OpenAPI reference: ${reference}`);
    }
    visited.add(reference);
    current = asObject(resolveLocalReference(document, reference));
  }
  return undefined;
}

function walkObjects(
  value: unknown,
  pointer: string,
  visit: (value: JsonObject, pointer: string) => void,
): void {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      walkObjects(entry, `${pointer}/${index}`, visit);
    }
    return;
  }
  const object = asObject(value);
  if (object === undefined) return;
  visit(object, pointer);
  for (const [name, entry] of Object.entries(object)) {
    walkObjects(entry, `${pointer}/${pointerToken(name)}`, visit);
  }
}
