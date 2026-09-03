import { generatedComment } from "../../generated-notices.ts";
import { compareText, renderJsDoc } from "./naming.ts";
import { asString } from "./openapi.ts";
import type { OpenApiDocument } from "./openapi.ts";
import { renderOperationDefinition } from "./render-operation-metadata.ts";
import { renderOperationTypes } from "./render-operation-types.ts";
import { renderProvenanceComment } from "./render-license-provenance.ts";
import { typeIdentifiers } from "./rest-client-render-context.ts";
import type { ProviderRenderContext, RenderedOperation } from "./rest-client-render-context.ts";

const runtimeTypes = [
  "RestBinary",
  "RestBody",
  "RestClientOptions",
  "RestGeneratedRequestOptions",
  "RestHttpStatus",
  "RestInt64",
  "RestJsonNumber",
  "RestJsonValue",
  "RestOperation",
  "RestRequestValue",
  "RestResponse",
  "RestSuccessfulStatus",
  "RestUndocumentedResponse",
] as const;

/** Render one complete provider/version REST client module from its normalized OpenAPI schema. */
export function renderProviderClientModule(
  context: ProviderRenderContext,
  document: OpenApiDocument,
): string {
  const infoTitle = asString(document.info.title) ?? context.names.displayName;
  const infoDescription = asString(document.info.description);
  const infoVersion = asString(document.info.version);
  const header = renderJsDoc([
    `${context.names.displayName} REST API client generated from ${infoTitle}${
      infoVersion ? ` ${infoVersion}` : ""
    }.`,
    infoDescription,
  ]);
  const componentDeclarations = [...context.schemas.entries()]
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([name, schema]) => context.schemaRenderer.renderComponent(name, schema))
    .join("\n\n");
  const operationTypeDeclarations = context.operations
    .map((operation) => renderOperationTypes(operation, context.schemaRenderer))
    .join("\n\n");
  const operationDefinitions = context.operations.map(renderOperationDefinition).join("\n");
  const methods = context.operations.map((operation) =>
    renderClientMethod(operation, context.operationsName)
  ).join("\n\n");
  const body = `${componentDeclarations}

${operationTypeDeclarations}

const ${context.operationsName}Source = {
${operationDefinitions}
} as const satisfies Readonly<Record<string, RestOperation>>;

/** Deterministic operation metadata for raw transport access and higher-level adapters. */
export const ${context.operationsName}: typeof ${context.operationsName}Source =
  deepFreezeRestOperations(${context.operationsName}Source);

/** Native-Fetch ${context.names.displayName} REST client. */
export class ${context.names.className} {
  static get servers(): typeof ${context.serversName} {
    return ${context.serversName};
  }

  static get securitySchemes(): typeof ${context.securitySchemesName} {
    return ${context.securitySchemesName};
  }

  /** Shared transport and raw-request escape hatch. */
  readonly rest: RestClient;

  constructor(options: RestClientOptions | RestClient) {
    this.rest = options instanceof RestClient ? options : new RestClient(options);
  }

${methods}
}

Object.defineProperties(${context.names.className}, {
  servers: { configurable: false },
  securitySchemes: { configurable: false },
});`;
  const identifiers = typeIdentifiers(body);
  const typeImports = runtimeTypes
    .filter((name) => identifiers.has(name))
    .map((name) => `  type ${name},`)
    .join("\n");

  return `${generatedComment("//")}${renderProvenanceComment(context.provenance)}${header}

import {
  deepFreezeRestMetadata,
  deepFreezeRestOperations,
  RestClient,
${typeImports}
} from ${JSON.stringify(context.runtimeModulePath)};

const ${context.serverDefinitionsName} = ${JSON.stringify(context.rootServers)} as const;
export const ${context.serversName}: typeof ${context.serverDefinitionsName} =
  deepFreezeRestMetadata(${context.serverDefinitionsName});

const ${context.securityDefinitionsName} = ${JSON.stringify(context.securitySchemes)} as const;
/** Provider-native OpenAPI security schemes retained as immutable metadata. */
export const ${context.securitySchemesName}: typeof ${context.securityDefinitionsName} =
  deepFreezeRestMetadata(${context.securityDefinitionsName});

${body}
`;
}

function renderClientMethod(
  operation: RenderedOperation,
  operationDefinitionsName: string,
): string {
  const tags = [
    `@operationId ${operation.operationId}`,
    ...(operation.tags.length === 0 ? [] : [`@category ${operation.tags.join(", ")}`]),
    ...(operation.externalDocs === undefined ? [] : [`@see ${operation.externalDocs}`]),
  ];
  const documentation = renderJsDoc(
    [operation.summary, operation.description],
    { deprecated: operation.deprecated, indent: "  ", tags },
  );
  return `${documentation}
  ${operation.methodName}(
    input: ${operation.inputTypeName}${operation.inputOptional ? " = {}" : ""},
    options?: RestGeneratedRequestOptions,
  ): Promise<${operation.responseTypeName}> {
    return this.rest.request<${operation.responseTypeName}>(${operationDefinitionsName}.${operation.methodName}, input, options);
  }`;
}
