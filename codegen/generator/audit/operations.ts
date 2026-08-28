import {
  asObject,
  asString,
  httpMethods,
  type JsonObject,
  objectEntries,
  type OpenApiDocument,
} from "../openapi.ts";
import { pointerToken, resolveLocalObject } from "./document.ts";
import { type AuditContext, diagnostic } from "./model.ts";

type OperationUse = {
  collectionName: string;
  method: string;
  pointer: string;
  rawPath: string;
  embeddedQuery: boolean;
  pathItem: JsonObject;
  operation: JsonObject;
};

type ParameterUse = {
  parameter: JsonObject;
  pointer: string;
};

export type AuditedOperationUse = OperationUse & {
  normalizedPath: string;
  operationId: string;
};

export function collectOperationUses(document: OpenApiDocument): OperationUse[] {
  const uses: OperationUse[] = [];
  const collections: Array<[string, JsonObject, boolean]> = [
    ["paths", document.paths, false],
  ];
  const queryPaths = asObject(document["x-ms-paths"]);
  if (queryPaths !== undefined) collections.push(["x-ms-paths", queryPaths, true]);
  for (const [collectionName, paths, embeddedQuery] of collections) {
    for (const [rawPath, pathItemValue] of objectEntries(paths)) {
      const pathItem = resolveLocalObject(document, pathItemValue);
      if (pathItem === undefined) continue;
      for (const method of httpMethods) {
        if (pathItem[method] === undefined) continue;
        const operation = resolveLocalObject(document, pathItem[method]);
        if (operation !== undefined) {
          uses.push({
            collectionName,
            method,
            pointer: `#/${collectionName}/${pointerToken(rawPath)}/${method}`,
            rawPath,
            embeddedQuery,
            pathItem,
            operation,
          });
        }
      }
    }
  }
  return uses;
}

export function collectTraceDiagnostics(
  { document, provider, metrics, diagnostics }: AuditContext,
): void {
  const collections: Array<[string, unknown]> = [
    ["paths", document.paths],
    ["x-ms-paths", asObject(document["x-ms-paths"])],
  ];
  for (const [collectionName, paths] of collections) {
    for (const [rawPath, pathItemValue] of objectEntries(paths)) {
      const pathItem = resolveLocalObject(document, pathItemValue);
      if (pathItem?.trace !== undefined) {
        metrics.traceOperationUses++;
        diagnostics.push(diagnostic(
          provider,
          `#/${collectionName}/${pointerToken(rawPath)}/trace`,
          "trace-operation",
          "reject-unsupported-http-method",
        ));
      }
    }
  }
}

/** Audit operation metadata and return the identity used by the media inventories. */
export function auditOperationUse(
  { document, provider, metrics, diagnostics }: AuditContext,
  use: OperationUse,
): AuditedOperationUse {
  const { rawPath, embeddedQuery, pathItem, operation } = use;
  const normalizedPath = normalizePath(rawPath, embeddedQuery);
  for (const group of optionalPathGroupUses(rawPath, embeddedQuery)) {
    metrics.optionalPathGroups++;
    if (group.literal) metrics.literalOptionalPathGroups++;
    diagnostics.push(diagnostic(
      provider,
      `${use.pointer}/$optionalPathGroups/${group.index}`,
      group.literal ? "literal-optional-path-group" : "parameterized-optional-path-group",
      group.policy,
    ));
  }
  const operationId = asString(operation.operationId) ?? `${use.method} ${normalizedPath}`;
  if (asString(operation.operationId) === undefined) {
    metrics.missingOperationIds++;
    diagnostics.push(diagnostic(
      provider,
      `${use.pointer}/operationId`,
      "missing-operation-id",
      "synthesize-stable-operation-name",
    ));
  }

  const parameters = effectiveParameters(
    document,
    pathItem.parameters,
    operation.parameters,
    use.pointer.slice(0, use.pointer.lastIndexOf("/")),
    use.pointer,
  );
  const availablePathParameters = new Set(
    [...parameters.values()]
      .filter(({ parameter }) => parameter.in === "path")
      .map(({ parameter }) => asString(parameter.name))
      .filter((name): name is string => name !== undefined),
  );
  const synthesized = new Set<string>();
  for (const name of pathCaptureNames(normalizedPath)) {
    if (availablePathParameters.has(name)) continue;
    synthesized.add(name);
  }
  for (const name of synthesized) {
    metrics.synthesizedPathParameters++;
    diagnostics.push(diagnostic(
      provider,
      `${use.pointer}/parameters/$synthesized/${pointerToken(name)}`,
      "synthesized-path-parameter",
      "synthesize-required-string",
    ));
  }

  for (const { parameter, pointer } of parameters.values()) {
    if (parameter.in === "cookie") metrics.cookieParameterUses++;
    if (parameter.style === "deepObject") metrics.deepObjectParameterUses++;
    if (parameter.allowReserved === true) metrics.allowReservedParameterUses++;
    if (parameter.in === "cookie") {
      diagnostics.push(diagnostic(
        provider,
        pointer,
        "cookie-parameter",
        "reject-unsupported-parameter-location",
      ));
    }
    if (parameter.allowReserved === true) {
      diagnostics.push(diagnostic(
        provider,
        `${pointer}/allowReserved`,
        "allow-reserved-parameter",
        "reject-unsupported-query-serialization",
      ));
    }
  }

  metrics.securityRequirements += securityRequirementCount(
    Object.hasOwn(operation, "security") ? operation.security : document.security,
  );
  for (const [name] of objectEntries(operation.callbacks)) {
    metrics.callbackUses++;
    diagnostics.push(diagnostic(
      provider,
      `${use.pointer}/callbacks/${pointerToken(name)}`,
      "callback",
      "reject-unsupported-callback",
    ));
  }
  if (
    (use.method === "get" || use.method === "head") &&
    Object.hasOwn(operation, "requestBody")
  ) {
    metrics.fetchForbiddenRequestBodies++;
    diagnostics.push(diagnostic(
      provider,
      `${use.pointer}/requestBody`,
      "fetch-forbidden-request-body",
      "preserve-provider-contract-document-native-fetch-limitation",
    ));
  }
  return { ...use, operationId, normalizedPath };
}

function effectiveParameters(
  document: OpenApiDocument,
  pathParameters: unknown,
  operationParameters: unknown,
  pathItemPointer: string,
  operationPointer: string,
): Map<string, ParameterUse> {
  const result = new Map<string, ParameterUse>();
  const collections: Array<[unknown, string]> = [
    [pathParameters, `${pathItemPointer}/parameters`],
    [operationParameters, `${operationPointer}/parameters`],
  ];
  for (const [values, basePointer] of collections) {
    if (!Array.isArray(values)) continue;
    for (const [index, value] of values.entries()) {
      const parameter = resolveLocalObject(document, value);
      if (parameter === undefined) continue;
      const location = asString(parameter.in);
      const name = asString(parameter.name);
      if (location !== undefined && name !== undefined) {
        result.set(`${location}:${name}`, {
          parameter,
          pointer: `${basePointer}/${index}`,
        });
      }
    }
  }
  return result;
}

function normalizePath(rawPath: string, embeddedQuery: boolean): string {
  let path = embeddedQuery ? rawPath.split("?", 1)[0] : rawPath;
  const escapedOpen = "\u0000OPEN\u0000";
  const escapedClose = "\u0000CLOSE\u0000";
  path = path
    .replaceAll("\\(", escapedOpen)
    .replaceAll("\\)", escapedClose)
    .replaceAll(/[()]/g, "")
    .replaceAll(escapedOpen, "(")
    .replaceAll(escapedClose, ")")
    .replaceAll(/\*([A-Za-z_][A-Za-z\d_]*)/g, "{$1}")
    .replaceAll(/\/{2,}/g, "/");
  return path.startsWith("/") ? path : `/${path}`;
}

type OptionalPathGroupUse = {
  index: number;
  literal: boolean;
  policy:
    | "bind-literal-group-to-adjacent-parameters"
    | "emit-all-or-none-optional-path-group"
    | "expose-typed-include-selector-default-true";
};

function optionalPathGroupUses(rawPath: string, embeddedQuery: boolean): OptionalPathGroupUse[] {
  const sourcePath = embeddedQuery ? rawPath.split("?", 1)[0] : rawPath;
  const parts: Array<{ group: boolean; text: string; index?: number }> = [];
  let text = "";
  let inGroup = false;
  let groupIndex = 0;
  for (let index = 0; index < sourcePath.length; index++) {
    const character = sourcePath[index];
    if (character === "\\" && ["(", ")"].includes(sourcePath[index + 1] ?? "")) {
      text += sourcePath[++index];
    } else if (character === "(") {
      if (inGroup) throw new Error(`${rawPath} contains a nested optional path group`);
      if (text !== "") parts.push({ group: false, text });
      text = "";
      inGroup = true;
    } else if (character === ")") {
      if (!inGroup) throw new Error(`${rawPath} contains an unmatched optional path group close`);
      parts.push({ group: true, index: groupIndex++, text });
      text = "";
      inGroup = false;
    } else {
      text += character;
    }
  }
  if (inGroup) throw new Error(`${rawPath} contains an unclosed optional path group`);
  if (text !== "") parts.push({ group: false, text });

  const parameters = parts.map((part) =>
    part.group
      ? [
        ...new Set([
          ...[...part.text.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]),
          ...[...part.text.matchAll(/\*([A-Za-z_][A-Za-z\d_]*)/g)].map((match) => match[1]),
        ]),
      ]
      : []
  );
  return parts.flatMap((part, partIndex): OptionalPathGroupUse[] => {
    if (!part.group) return [];
    if (parameters[partIndex].length > 0) {
      return [{
        index: part.index!,
        literal: false,
        policy: "emit-all-or-none-optional-path-group",
      }];
    }
    const adjacentParameters = [parameters[partIndex + 1], parameters[partIndex - 1]]
      .find((value) => value !== undefined && value.length > 0);
    return [{
      index: part.index!,
      literal: true,
      policy: adjacentParameters === undefined
        ? "expose-typed-include-selector-default-true"
        : "bind-literal-group-to-adjacent-parameters",
    }];
  });
}

export function operationKey(use: OperationUse): string {
  return `${use.collectionName}:${use.method}:${use.rawPath}`;
}

function pathCaptureNames(path: string): string[] {
  return [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}

function securityRequirementCount(value: unknown): number {
  return Array.isArray(value) ? value.filter((entry) => asObject(entry) !== undefined).length : 0;
}
