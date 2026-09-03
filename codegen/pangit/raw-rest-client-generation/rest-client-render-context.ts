import { allocateClientNames, requiredName, sortRecord } from "./rest-client-manifests.ts";
import type { ProviderNames, ProviderPublicNames } from "./rest-client-manifests.ts";
import { compareText } from "./naming.ts";
import { asObject, asString } from "./openapi.ts";
import type { JsonObject, OpenApiDocument } from "./openapi.ts";
import {
  collectOperations,
  collectSecuritySchemes,
  operationInputIsOptional,
} from "./operations.ts";
import type { OperationModel } from "./operations.ts";
import { SchemaRenderer } from "./schema.ts";

export type ProviderRenderOptions = {
  captureNames?: (names: ProviderPublicNames) => void;
  lockedNames?: ProviderPublicNames;
  names?: ProviderNames;
  runtimeModulePath?: string;
  /** Backward-compatible alias for runtimeModulePath. */
  restModulePath?: string;
  provenance?: ProviderSourceProvenance;
};

export type ProviderSourceProvenance = {
  specificationSource: string;
  specificationSha256: string;
  licenseSpdx: "MIT" | null;
  licenseSource: string | null;
  licenseSha256: string | null;
  licenseDeclaration: { name: string; url: string } | null;
  attribution: string | null;
};

export type RenderedOperation = OperationModel & {
  methodName: string;
  inputTypeName: string;
  responseTypeName: string;
  inputOptional: boolean;
};

export type ProviderRenderContext = {
  componentAliases: ReadonlyMap<string, string>;
  names: ProviderNames;
  operations: readonly RenderedOperation[];
  operationsName: string;
  provenance?: ProviderSourceProvenance;
  rootServers: readonly string[];
  runtimeModulePath: string;
  schemaRenderer: SchemaRenderer;
  schemas: ReadonlyMap<string, JsonObject>;
  securityDefinitionsName: string;
  securitySchemes: ReturnType<typeof collectSecuritySchemes>;
  securitySchemesName: string;
  serverDefinitionsName: string;
  serversName: string;
};

export function createProviderRenderContext(
  document: OpenApiDocument,
  fallbackNames: ProviderNames,
  options: ProviderRenderOptions,
): ProviderRenderContext {
  const names = options.names ?? fallbackNames;
  const operations = collectOperations(document);
  const allocated = allocateClientNames(names, document, operations, options.lockedNames);
  options.captureNames?.({
    methods: sortRecord(Object.fromEntries(allocated.operationNames)),
    symbols: sortRecord(Object.fromEntries(allocated.symbols)),
  });

  const componentAliases = new Map(
    [...allocated.schemas.keys()].map((name) => [
      name,
      requiredName(allocated.symbols, `schema:${name}`),
    ]),
  );
  const renderedOperations = operations.map((operation): RenderedOperation => ({
    ...operation,
    methodName: requiredName(allocated.operationNames, operation.key),
    inputTypeName: requiredName(allocated.symbols, `input:${operation.key}`),
    responseTypeName: requiredName(allocated.symbols, `response:${operation.key}`),
    inputOptional: operationInputIsOptional(operation),
  })).toSorted((left, right) => compareText(left.methodName, right.methodName));

  return {
    componentAliases,
    names,
    operations: renderedOperations,
    operationsName: allocated.operationsName,
    provenance: options.provenance,
    rootServers: Array.isArray(document.servers)
      ? document.servers.flatMap((server) => {
        const url = asString(asObject(server)?.url);
        return url === undefined ? [] : [url];
      })
      : [],
    runtimeModulePath: options.runtimeModulePath ?? options.restModulePath ??
      "../../runtime/mod.ts",
    schemaRenderer: new SchemaRenderer(componentAliases),
    schemas: allocated.schemas,
    securityDefinitionsName: allocated.securityDefinitionsName,
    securitySchemes: collectSecuritySchemes(document),
    securitySchemesName: allocated.securitySchemesName,
    serverDefinitionsName: allocated.serverDefinitionsName,
    serversName: allocated.serversName,
  };
}

export function typeIdentifiers(source: string): ReadonlySet<string> {
  const identifiers = new Set<string>();
  let state: "code" | "line" | "block" | "single" | "double" | "template" = "code";
  for (let index = 0; index < source.length; index++) {
    const current = source[index];
    const next = source[index + 1];
    if (state === "line") {
      if (current === "\n") state = "code";
      continue;
    }
    if (state === "block") {
      if (current === "*" && next === "/") {
        state = "code";
        index++;
      }
      continue;
    }
    if (state !== "code") {
      const end = state === "single" ? "'" : state === "double" ? '"' : "`";
      if (current === "\\") index++;
      else if (current === end) state = "code";
      continue;
    }
    if (current === "/" && next === "/") {
      state = "line";
      index++;
      continue;
    }
    if (current === "/" && next === "*") {
      state = "block";
      index++;
      continue;
    }
    if (current === "'" || current === '"' || current === "`") {
      state = current === "'" ? "single" : current === '"' ? "double" : "template";
      continue;
    }
    if (!/[A-Za-z_$]/.test(current)) continue;
    let end = index + 1;
    while (end < source.length && /[A-Za-z\d_$]/.test(source[end])) end++;
    identifiers.add(source.slice(index, end));
    index = end - 1;
  }
  return identifiers;
}
