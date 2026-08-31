import { generatedComment } from "../../generated-notices.ts";
import { allocateOperationNames, namesForProvider, requiredName } from "./client-manifests.ts";
import type { ProviderPublicNames } from "./client-manifests.ts";
import { compareText } from "./naming.ts";
import type { OpenApiDocument, OpenApiHttpMethod } from "./openapi.ts";
import { collectOperations } from "./operations.ts";
import { createProviderRenderContext, type ProviderRenderOptions } from "./render-context.ts";
import { renderProviderClientModule } from "./render-provider-client.ts";

export type ClientOperationDescriptor = {
  source: { collection: "paths" | "x-ms-paths"; path: string };
  methodName: string;
  operationId: string;
  method: Uppercase<OpenApiHttpMethod>;
  path: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  tags: readonly string[];
};

export type RenderProviderClientOptions = ProviderRenderOptions;

export function renderProviderClientFiles(
  provider: string,
  document: OpenApiDocument,
  options: RenderProviderClientOptions = {},
): ReadonlyMap<string, string> {
  const context = createProviderRenderContext(
    document,
    namesForProvider(provider),
    options,
  );
  const clientFile = `${context.names.className}.ts`;
  return new Map([
    ["mod.ts", `${generatedComment("//")}export * from ${JSON.stringify(`./${clientFile}`)};\n`],
    [clientFile, renderProviderClientModule(context, document)],
  ]);
}

export function renderProviderClient(
  provider: string,
  document: OpenApiDocument,
  options: RenderProviderClientOptions = {},
): string {
  const files = renderProviderClientFiles(provider, document, options);
  const clientFiles = [...files].filter(([name]) => name !== "mod.ts");
  if (clientFiles.length !== 1) {
    throw new Error(`Provider renderer emitted ${clientFiles.length} client modules`);
  }
  return clientFiles[0][1];
}

export function describeClientOperations(
  document: OpenApiDocument,
  lockedNames?: ProviderPublicNames,
): ClientOperationDescriptor[] {
  const operations = collectOperations(document);
  const names = allocateOperationNames(
    operations,
    new Map(Object.entries(lockedNames?.methods ?? {})),
  );
  return operations.map((operation) => ({
    source: {
      collection: operation.key.startsWith("x-ms-paths:")
        ? "x-ms-paths" as const
        : "paths" as const,
      path: operation.key.slice(operation.key.indexOf(":", operation.key.indexOf(":") + 1) + 1),
    },
    methodName: requiredName(names, operation.key),
    operationId: operation.operationId,
    method: operation.method,
    path: operation.path,
    summary: operation.summary,
    description: operation.description,
    deprecated: operation.deprecated,
    tags: operation.tags,
  })).toSorted((left, right) => compareText(left.methodName, right.methodName));
}
