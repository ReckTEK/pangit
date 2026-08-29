/** Render TypeScript clients and the lazy provider registry from the supported operation model. */
import { generatedComment } from "../notices.ts";
import {
  allocateClientNames,
  allocateOperationNames,
  namesForProvider,
  requiredName,
  sortRecord,
} from "./client-manifests.ts";
import type {
  ProviderNames,
  ProviderPublicNames,
  RestClientSpecManifest,
} from "./client-manifests.ts";
import { compareText, renderJsDoc } from "./naming.ts";
import { asObject, asString } from "./openapi.ts";
import type { OpenApiDocument, OpenApiHttpMethod } from "./openapi.ts";
import {
  collectOperations,
  collectSecuritySchemes,
  isFormMediaType,
  isStandardJsonMediaType,
  operationInputIsOptional,
  responseDecodeMode,
  schemaIsText,
} from "./operations.ts";
import type { MediaModel, OperationModel, ParameterModel } from "./operations.ts";
import { SchemaRenderer, union } from "./schema.ts";

type RenderedOperation = OperationModel & {
  methodName: string;
  inputTypeName: string;
  responseTypeName: string;
  inputOptional: boolean;
};

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

type RenderProviderClientOptions = {
  captureNames?: (names: ProviderPublicNames) => void;
  lockedNames?: ProviderPublicNames;
  restModulePath?: string;
  names?: ProviderNames;
};

export function renderProviderClient(
  provider: string,
  document: OpenApiDocument,
  options: RenderProviderClientOptions = {},
): string {
  const names = options.names ?? namesForProvider(provider);
  const operations = collectOperations(document);
  const {
    schemas,
    operationNames,
    symbols,
    operationsName,
    securitySchemesName,
    serversName,
    serverDefinitionsName,
    securityDefinitionsName,
  } = allocateClientNames(names, document, operations, options.lockedNames);
  options.captureNames?.({
    methods: sortRecord(Object.fromEntries(operationNames)),
    symbols: sortRecord(Object.fromEntries(symbols)),
  });
  const componentNames = new Map(
    [...schemas.keys()].map((name) => [name, requiredName(symbols, `schema:${name}`)]),
  );
  const schemaRenderer = new SchemaRenderer(componentNames);
  const renderedOperations: RenderedOperation[] = operations.map((operation) => {
    const methodName = requiredName(operationNames, operation.key);
    return {
      ...operation,
      methodName,
      inputTypeName: requiredName(symbols, `input:${operation.key}`),
      responseTypeName: requiredName(symbols, `response:${operation.key}`),
      inputOptional: operationInputIsOptional(operation),
    };
  }).toSorted((left, right) => compareText(left.methodName, right.methodName));

  const infoTitle = asString(document.info.title) ?? names.displayName;
  const infoDescription = asString(document.info.description);
  const infoVersion = asString(document.info.version);
  const header = renderJsDoc([
    `${names.displayName} REST API client generated from ${infoTitle}${
      infoVersion ? ` ${infoVersion}` : ""
    }.`,
    infoDescription,
  ]);
  const rootServers = Array.isArray(document.servers)
    ? document.servers.flatMap((server) => {
      const url = asString(asObject(server)?.url);
      return url === undefined ? [] : [url];
    })
    : [];
  const securitySchemes = collectSecuritySchemes(document);

  const componentDeclarations = [...schemas.entries()]
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([name, schema]) => schemaRenderer.renderComponent(name, schema))
    .join("\n\n");
  const operationTypeDeclarations = renderedOperations
    .map((operation) => renderOperationTypes(operation, schemaRenderer))
    .join("\n\n");
  const operationDefinitions = renderedOperations
    .map((operation) => renderOperationDefinition(operation))
    .join("\n");
  const methods = renderedOperations
    .map((operation) => renderClientMethod(operation, operationsName))
    .join("\n\n");
  const conditionalTypeImports = renderConditionalTypeImports(
    `${componentDeclarations}\n${operationTypeDeclarations}`,
  );

  return `${generatedComment("//")}${header}

import {
${conditionalTypeImports}  type RestBody,
  RestClient,
  type RestClientOptions,
  type RestGeneratedRequestOptions,
  type RestOperation,
  type RestResponse,
  type RestUndocumentedResponse,
  deepFreezeRestOperations,
  deepFreezeRestMetadata,
} from ${JSON.stringify(options.restModulePath ?? "../rest/mod.ts")};

const ${serverDefinitionsName} = ${JSON.stringify(rootServers)} as const;
export const ${serversName}: typeof ${serverDefinitionsName} = deepFreezeRestMetadata(${serverDefinitionsName});

const ${securityDefinitionsName} = ${JSON.stringify(securitySchemes)} as const;
/** Provider-native OpenAPI security schemes retained as immutable metadata. */
export const ${securitySchemesName}: typeof ${securityDefinitionsName} = deepFreezeRestMetadata(${securityDefinitionsName});

${componentDeclarations}

${operationTypeDeclarations}

/** Deterministic operation metadata for raw transport access and higher-level adapters. */
export const ${operationsName} = deepFreezeRestOperations({
${operationDefinitions}
} as const satisfies Readonly<Record<string, RestOperation>>);

/** Native-Fetch ${names.displayName} REST client. */
export class ${names.className} {
  static get servers(): typeof ${serversName} {
    return ${serversName};
  }

  static get securitySchemes(): typeof ${securitySchemesName} {
    return ${securitySchemesName};
  }

  /** Shared transport and raw-request escape hatch. */
  readonly rest: RestClient;

  constructor(options: RestClientOptions | RestClient) {
    this.rest = options instanceof RestClient ? options : new RestClient(options);
  }

${methods}
}

Object.defineProperties(${names.className}, {
  servers: { configurable: false },
  securitySchemes: { configurable: false },
});
`;
}

export function renderGeneratedModule(
  manifest: RestClientSpecManifest,
  options: { readonly restModulePath?: string } = {},
): string {
  const providers = Object.keys(manifest.providers).toSorted(compareText);
  const versions = Object.fromEntries(
    providers.map((provider) => [
      provider,
      Object.keys(manifest.providers[provider].versions).toSorted(compareText),
    ]),
  );
  const typeMap = providers.map((provider) => {
    const className = manifest.providers[provider].client.className;
    const entries = versions[provider].map((version) =>
      `    ${JSON.stringify(version)}: import(${
        JSON.stringify(
          manifest.providers[provider].versions[version].artifacts.client.replace(
            /^src\/generated\//,
            "./",
          ),
        )
      }).${className};`
    );
    return `  ${JSON.stringify(provider)}: {\n${entries.join("\n")}\n  };`;
  });
  const loaders = providers.map((provider) => {
    const className = manifest.providers[provider].client.className;
    const entries = versions[provider].map((version) =>
      `    ${JSON.stringify(version)}: async (options) => new (await import(${
        JSON.stringify(
          manifest.providers[provider].versions[version].artifacts.client.replace(
            /^src\/generated\//,
            "./",
          ),
        )
      })).${className}(options),`
    );
    return `  ${JSON.stringify(provider)}: {\n${entries.join("\n")}\n  },`;
  });

  return `${
    generatedComment("//")
  }/** Strongly typed lazy loader for provider REST client versions. */
import type { RestClient, RestClientOptions } from ${
    JSON.stringify(options.restModulePath ?? "../rest/mod.ts")
  };

export const restClientVersions = ${JSON.stringify(versions)} as const;

export type Provider = keyof RestClientTypeMap;
export type ProviderVersion<TProvider extends Provider> =
  keyof RestClientTypeMap[TProvider] & string;

export type RestClientProvider = Provider;
export type RestClientVersion<TProvider extends RestClientProvider> = ProviderVersion<TProvider>;

export type RestClientTypeMap = {
${typeMap.join("\n")}
};

type RestClientLoader = (
  options: RestClientOptions | RestClient,
) => Promise<unknown>;

const restClientLoaders = {
${loaders.join("\n")}
} satisfies Record<RestClientProvider, Record<string, RestClientLoader>>;

export function loadRestClient<
  TProvider extends RestClientProvider,
  TVersion extends RestClientVersion<TProvider>,
>(
  provider: TProvider,
  version: TVersion,
  options: RestClientOptions | RestClient,
): Promise<RestClientTypeMap[TProvider][TVersion]> {
  const loader = (restClientLoaders[provider] as Record<string, RestClientLoader>)[version];
  if (loader === undefined) {
    throw new Error(\`Unknown REST client version \${provider} \${version}\`);
  }
  return loader(options) as Promise<RestClientTypeMap[TProvider][TVersion]>;
}
`;
}

/** Describe the exact public methods emitted for an OpenAPI document. */
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

function renderConditionalTypeImports(declarations: string): string {
  const names = [
    "RestBinary",
    "RestInt64",
    "RestJsonNumber",
    "RestJsonValue",
    "RestRequestValue",
  ].filter((name) => declarations.includes(name));
  if (declarations.includes("RestHttpStatus")) {
    names.push("RestHttpStatus", "RestSuccessfulStatus");
  }
  return names.map((name) => `  type ${name},\n`).join("");
}

function renderOperationTypes(operation: RenderedOperation, renderer: SchemaRenderer): string {
  return `${renderInputType(operation, renderer)}\n\n${renderResponseType(operation, renderer)}`;
}

function renderInputType(operation: RenderedOperation, renderer: SchemaRenderer): string {
  const groups: string[] = [];
  for (const location of ["path", "query", "header"] as const) {
    const parameters = operation.parameters.filter((parameter) => parameter.location === location);
    if (parameters.length === 0) continue;
    const propertyName = location === "header" ? "headers" : location;
    const required = parameters.some((parameter) => parameter.required);
    const parameterType = location === "path"
      ? renderPathParameterObject(operation, parameters, renderer)
      : renderParameterObject(parameters, renderer);
    groups.push(
      `  ${propertyName}${required ? "" : "?"}: ${indentContinuation(parameterType, 2)};`,
    );
  }
  const pathGroupSelectors = operation.pathGroups.flatMap((group) =>
    group.selector === undefined ? [] : [group.selector]
  );
  if (pathGroupSelectors.length > 0) {
    groups.push(`  pathGroups?: {
${pathGroupSelectors.map((selector) => `    ${JSON.stringify(selector)}?: boolean;`).join("\n")}
  };`);
  }
  if (operation.body !== undefined) {
    const bodyType = operation.body.content.length === 0
      ? "RestBody<string, unknown>"
      : union(operation.body.content.map((media) =>
        `RestBody<${JSON.stringify(media.mediaType)}, ${renderRequestBodyType(media, renderer)}>`
      ));
    const documentation = renderJsDoc([operation.body.description], { indent: "  " });
    if (documentation !== "") groups.push(documentation);
    groups.push(`  body${operation.body.required ? "" : "?"}: ${indentContinuation(bodyType, 2)};`);
  }
  const value = groups.length === 0 ? "Record<string, never>" : `{
${groups.join("\n")}
}`;
  return `export type ${operation.inputTypeName} = ${value};`;
}

function renderParameterObject(
  parameters: readonly ParameterModel[],
  renderer: SchemaRenderer,
): string {
  const lines = ["{"];
  for (const parameter of parameters) {
    const documentation = renderJsDoc([parameter.description], {
      deprecated: parameter.deprecated,
      indent: "  ",
    });
    if (documentation !== "") lines.push(documentation);
    lines.push(
      `  ${JSON.stringify(parameter.name)}${parameter.required ? "" : "?"}: ${
        indentContinuation(renderer.render(parameter.schema), 2)
      };`,
    );
  }
  lines.push("}");
  return lines.join("\n");
}

function renderPathParameterObject(
  operation: OperationModel,
  parameters: readonly ParameterModel[],
  renderer: SchemaRenderer,
): string {
  const constrainedGroups = operation.pathGroups
    .flatMap((group) =>
      group.parameters !== undefined && group.parameters.length > 1 ? [group.parameters] : []
    )
    .filter((names, index, groups) =>
      groups.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(names)) === index
    );
  if (constrainedGroups.length === 0) return renderParameterObject(parameters, renderer);

  const constrainedNames = new Set(constrainedGroups.flat());
  const members: string[] = [];
  const baseParameters = parameters.filter((parameter) => !constrainedNames.has(parameter.name));
  if (baseParameters.length > 0) members.push(renderParameterObject(baseParameters, renderer));
  for (const names of constrainedGroups) {
    const groupParameters = names.map((name) => {
      const parameter = parameters.find((candidate) => candidate.name === name);
      if (parameter === undefined) {
        throw new Error(
          `${operation.operationId} optional path group parameter ${name} is missing`,
        );
      }
      return { ...parameter, required: true };
    });
    const absent = `{
${names.map((name) => `  ${JSON.stringify(name)}?: never;`).join("\n")}
}`;
    members.push(`(${renderParameterObject(groupParameters, renderer)} | ${absent})`);
  }
  return members.join(" & ");
}

function renderResponseType(operation: RenderedOperation, renderer: SchemaRenderer): string {
  const members: string[] = [];
  const explicitStatuses = new Set(
    operation.responses.flatMap((response) =>
      response.status === "default" ? [] : [response.status]
    ),
  );
  for (const response of operation.responses) {
    const statusVariants = response.status === "default"
      ? renderDefaultResponseStatuses(
        explicitStatuses,
        operation.method !== "HEAD" && response.content.length > 0,
      )
      : [{
        status: String(response.status),
        ok: response.status >= 200 && response.status < 300 ? "true" as const : "false" as const,
      }];
    const noContent = operation.method === "HEAD" || response.status === 204 ||
      response.status === 205;
    if (
      response.status === "default" && operation.method !== "HEAD" &&
      response.content.length > 0
    ) {
      for (const noContentStatus of [204, 205] as const) {
        if (explicitStatuses.has(noContentStatus)) continue;
        members.push(
          renderRestResponse(
            String(noContentStatus),
            "undefined",
            "undefined",
            "true",
            response.headers,
          ),
        );
      }
    }
    for (const { status, ok } of statusVariants) {
      if (response.content.length === 0 || noContent) {
        members.push(renderRestResponse(status, "undefined", "undefined", ok, response.headers));
      } else {
        for (const media of response.content) {
          members.push(
            renderRestResponse(
              status,
              renderResponseBodyType(media, renderer),
              JSON.stringify(media.mediaType),
              ok,
              response.headers,
            ),
          );
        }
      }
    }
  }
  members.push("RestUndocumentedResponse");
  const value = [...new Set(members)].join("\n  | ");
  return `export type ${operation.responseTypeName} =\n  | ${value};`;
}

function renderDefaultResponseStatuses(
  explicitStatuses: ReadonlySet<number>,
  excludeNoContentStatuses: boolean,
): readonly [{ status: string; ok: "true" }, { status: string; ok: "false" }] {
  const excluded = new Set(explicitStatuses);
  if (excludeNoContentStatuses) {
    excluded.add(204);
    excluded.add(205);
  }
  const successStatuses = [...excluded]
    .filter((status) => status >= 200 && status < 300)
    .toSorted((left, right) => left - right);
  const failureStatuses = [...excluded]
    .filter((status) => status < 200 || status >= 300)
    .toSorted((left, right) => left - right);
  return [
    {
      status: successStatuses.length === 0
        ? "RestSuccessfulStatus"
        : `Exclude<RestSuccessfulStatus, ${successStatuses.join(" | ")}>`,
      ok: "true",
    },
    {
      status: `Exclude<RestHttpStatus, ${
        ["RestSuccessfulStatus", ...failureStatuses.map(String)].join(" | ")
      }>`,
      ok: "false",
    },
  ];
}

function renderOperationDefinition(operation: RenderedOperation): string {
  const pathParameters = operation.parameters.filter((parameter) => parameter.location === "path");
  const queryParameters = operation.parameters.filter((parameter) =>
    parameter.location === "query"
  );
  const requestMediaTypes = operation.body?.content.map((media) => media.mediaType) ?? [];
  const fields = [
    `id: ${JSON.stringify(operation.operationId)}`,
    `method: ${JSON.stringify(operation.method)}`,
    `path: ${JSON.stringify(operation.path)}`,
    ...(operation.server === undefined ? [] : [`server: ${JSON.stringify(operation.server)}`]),
    ...(operation.pathGroups.length === 0
      ? []
      : [`pathGroups: ${JSON.stringify(operation.pathGroups)}`]),
    ...(pathParameters.length === 0
      ? []
      : [`pathParameters: ${
        JSON.stringify(pathParameters.map((parameter) => ({
          name: parameter.name,
          ...(parameter.multiSegment ? { multiSegment: true } : {}),
        })))
      }`]),
    ...(queryParameters.length === 0
      ? []
      : [`queryParameters: ${
        JSON.stringify(queryParameters.map((parameter) => {
          const style = parameter.style ?? "form";
          return {
            name: parameter.name,
            style,
            explode: parameter.explode ?? style === "form",
            ...(parameter.allowReserved ? { allowReserved: true } : {}),
          };
        }))
      }`]),
    ...(requestMediaTypes.length === 0
      ? []
      : [`requestMediaTypes: ${JSON.stringify(requestMediaTypes)}`]),
    ...(operation.security === undefined
      ? []
      : [`security: ${JSON.stringify(operation.security)}`]),
    `responses: ${
      JSON.stringify(operation.responses.map((response) => ({
        status: response.status,
        mediaTypes: response.content.map((media) => media.mediaType),
        ...(response.content.length === 0 ? {} : {
          decoders: Object.fromEntries(
            response.content.map((media) => [media.mediaType, responseDecodeMode(media)]),
          ),
        }),
        ...(response.headers.length === 0 ? {} : { headers: response.headers }),
      })))
    }`,
  ];
  return `  ${operation.methodName}: {
    ${fields.join(",\n    ")},
  },`;
}

function renderClientMethod(operation: RenderedOperation, operationsName: string): string {
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
    return this.rest.request<${operation.responseTypeName}>(${operationsName}.${operation.methodName}, input, options);
  }`;
}

function renderRequestBodyType(media: MediaModel, renderer: SchemaRenderer): string {
  if (isStandardJsonMediaType(media.mediaType)) {
    return `RestJsonValue<RestRequestValue<${renderer.render(media.schema)}>>`;
  }
  if (isFormMediaType(media.mediaType)) {
    return `RestRequestValue<${renderer.render(media.schema)}>`;
  }
  return responseDecodeMode(media) === "text" ? "string" : "RestBinary";
}

function renderResponseBodyType(media: MediaModel, renderer: SchemaRenderer): string {
  const mode = responseDecodeMode(media);
  if (mode === "json") return `RestJsonValue<${renderer.render(media.schema)}>`;
  if (mode === "binary") return "globalThis.Blob";
  return schemaIsText(media.schema) ? renderer.render(media.schema) : "string";
}

function renderRestResponse(
  status: string,
  body: string,
  mediaType: string,
  ok: string,
  headers: readonly string[],
): string {
  const headerType = headers.length === 0
    ? ""
    : `, { ${headers.map((name) => `readonly ${JSON.stringify(name)}?: string`).join("; ")} }`;
  return `RestResponse<${status}, ${body}, ${mediaType}, ${ok}${headerType}>`;
}

function indentContinuation(value: string, spaces: number): string {
  const indent = " ".repeat(spaces);
  return value.replaceAll("\n", `\n${indent}`);
}
