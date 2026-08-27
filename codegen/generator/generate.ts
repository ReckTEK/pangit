import { allocateNames, compareText, renderJsDoc, toIdentifier } from "./naming.ts";
import {
  asBoolean,
  asObject,
  asString,
  componentSchemas,
  firstServerUrl,
  httpMethods,
  type JsonObject,
  objectEntries,
  type OpenApiDocument,
  type OpenApiHttpMethod,
  parseOpenApiDocument,
  resolveObject,
} from "./openapi.ts";
import { SchemaRenderer, union } from "./schema.ts";

const defaultNormalizedSpecsDirectory = new URL("../specs/normalized/", import.meta.url);
const defaultSpecManifestFile = new URL("../specs/raw/manifest.json", import.meta.url);
const defaultGeneratedClientsDirectory = new URL("../../src/generated/", import.meta.url);
const denoConfiguration = new URL("../../deno.json", import.meta.url);
const defaultPublicNamesFile = new URL("./public-names.json", import.meta.url);

const providerNames: Readonly<Record<string, ProviderNames>> = {
  "azure-devops": {
    className: "AzureDevOpsRestClient",
    displayName: "Azure DevOps",
    namespaceName: "AzureDevOpsApi",
    variablePrefix: "azureDevOps",
  },
  bitbucket: {
    className: "BitbucketRestClient",
    displayName: "Bitbucket",
    namespaceName: "BitbucketApi",
    variablePrefix: "bitbucket",
  },
  codeberg: {
    className: "CodebergRestClient",
    displayName: "Codeberg",
    namespaceName: "CodebergApi",
    variablePrefix: "codeberg",
  },
  gitea: {
    className: "GiteaRestClient",
    displayName: "Gitea",
    namespaceName: "GiteaApi",
    variablePrefix: "gitea",
  },
  github: {
    className: "GitHubRestClient",
    displayName: "GitHub",
    namespaceName: "GitHubApi",
    variablePrefix: "gitHub",
  },
  gitlab: {
    className: "GitLabRestClient",
    displayName: "GitLab",
    namespaceName: "GitLabApi",
    variablePrefix: "gitLab",
  },
};

/** Providers required for a complete checked generation. */
export const expectedRestClientProviders = Object.freeze(
  Object.keys(providerNames).toSorted(compareText),
);

type ProviderNames = {
  className: string;
  displayName: string;
  namespaceName: string;
  variablePrefix: string;
};

type ParameterModel = {
  name: string;
  location: "header" | "path" | "query";
  required: boolean;
  schema: unknown;
  description?: string;
  deprecated?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  multiSegment?: boolean;
};

type BodyModel = {
  required: boolean;
  description?: string;
  content: readonly MediaModel[];
};

type MediaModel = {
  mediaType: string;
  schema: unknown;
};

type ResponseModel = {
  status: number | "default";
  description?: string;
  content: readonly MediaModel[];
  headers: readonly string[];
};

type SecurityRequirementModel = Readonly<Record<string, readonly string[]>>;

type PathGroupModel = {
  start: number;
  end: number;
  parameters?: readonly string[];
  selector?: string;
  defaultIncluded?: boolean;
};

type OperationModel = {
  key: string;
  operationId: string;
  method: Uppercase<OpenApiHttpMethod>;
  path: string;
  pathGroups: readonly PathGroupModel[];
  summary?: string;
  description?: string;
  deprecated?: boolean;
  externalDocs?: string;
  tags: readonly string[];
  parameters: readonly ParameterModel[];
  body?: BodyModel;
  responses: readonly ResponseModel[];
  security?: readonly SecurityRequirementModel[];
  server?: string;
};

type RenderedOperation = OperationModel & {
  methodName: string;
  inputTypeName: string;
  responseTypeName: string;
  inputOptional: boolean;
};

export type ClientOperationDescriptor = {
  methodName: string;
  operationId: string;
  method: Uppercase<OpenApiHttpMethod>;
  path: string;
  summary?: string;
  description?: string;
  deprecated?: boolean;
  tags: readonly string[];
};

export type RestClientGenerationOptions = {
  /** Compare rendered output with the destination without writing. */
  check?: boolean;
  generatedClientsDirectory?: URL;
  normalizedSpecsDirectory?: URL;
  publicNamesFile?: URL;
  specManifestFile?: URL;
  /** Refresh reviewed names while preserving every still-present locked allocation. */
  updatePublicNames?: boolean;
};

export type ProviderPublicNames = {
  methods: Readonly<Record<string, string>>;
  symbols: Readonly<Record<string, string>>;
};

export type RestClientPublicNamesManifest = {
  providers: Readonly<Record<string, ProviderPublicNames>>;
  version: 1;
};

type RenderProviderClientOptions = {
  captureNames?: (names: ProviderPublicNames) => void;
  lockedNames?: ProviderPublicNames;
  restModulePath?: string;
};

type RestClientSpecManifest = {
  providers: Record<string, {
    selected: string;
    versions: Record<string, { destination: string }>;
  }>;
  schemaVersion: 1;
};

/** Render, format, validate, then atomically replace or check the complete generated tree. */
export async function generateRestClients(
  options: RestClientGenerationOptions = {},
): Promise<void> {
  const normalizedSpecsDirectory = options.normalizedSpecsDirectory ??
    defaultNormalizedSpecsDirectory;
  const generatedClientsDirectory = options.generatedClientsDirectory ??
    defaultGeneratedClientsDirectory;
  const publicNamesFile = options.publicNamesFile ?? defaultPublicNamesFile;
  const specManifestFile = options.specManifestFile ?? defaultSpecManifestFile;
  if (options.check && options.updatePublicNames) {
    throw new Error("Public-name update cannot run in check mode");
  }
  const manifest = await readSpecManifest(specManifestFile);
  const providers = Object.keys(manifest.providers).toSorted(compareText);
  assertExpectedProviderSet(providers);
  const lockedNames = await readPublicNamesManifest(
    publicNamesFile,
    options.updatePublicNames ?? false,
  );

  const rendered = new Map<string, string>();
  const capturedProviders: Record<string, ProviderPublicNames> = {};
  for (const provider of providers) {
    const providerManifest = manifest.providers[provider];
    for (const version of Object.keys(providerManifest.versions).toSorted(compareText)) {
      const document = parseOpenApiDocument(
        await Deno.readTextFile(
          new URL(`${provider}/${version}.json`, normalizedSpecsDirectory),
        ),
        `${provider} ${version}`,
      );
      rendered.set(
        `${provider}/${version}.ts`,
        renderProviderClient(provider, document, {
          captureNames: version === providerManifest.selected
            ? (names) => capturedProviders[provider] = names
            : undefined,
          lockedNames: lockedNames.providers[provider],
          restModulePath: "../../rest.ts",
        }),
      );
    }
  }
  rendered.set("mod.ts", renderGeneratedModule(manifest));
  const capturedNames: RestClientPublicNamesManifest = {
    version: 1,
    providers: sortRecord(capturedProviders),
  };
  if (!options.updatePublicNames) assertPublicNamesCurrent(lockedNames, capturedNames);

  const formatted = await formatGeneratedSources(rendered);
  if (options.check) {
    await validateGeneratedSources(generatedClientsDirectory, formatted);
    await assertGeneratedSourcesCurrent(generatedClientsDirectory, formatted);
  } else {
    await replaceGeneratedDirectory(generatedClientsDirectory, formatted, {
      manifest: options.updatePublicNames
        ? {
          file: publicNamesFile,
          source: `${JSON.stringify(capturedNames, null, 2)}\n`,
        }
        : undefined,
    });
  }

  for (const provider of providers) {
    for (
      const version of Object.keys(manifest.providers[provider].versions).toSorted(compareText)
    ) {
      console.log(JSON.stringify({
        provider,
        version,
        destination: `src/generated/${provider}/${version}.ts`,
        mode: options.check ? "checked" : "written",
      }));
    }
  }
}

export function assertExpectedProviderSet(
  providers: readonly string[],
): void {
  const actual = [...providers].toSorted(compareText);
  const missing = expectedRestClientProviders.filter((provider) => !actual.includes(provider));
  const unexpected = actual.filter((provider) => !expectedRestClientProviders.includes(provider));
  if (missing.length === 0 && unexpected.length === 0) return;
  throw new Error(
    `Normalized provider set is incomplete or unexpected; missing=[${
      missing.join(", ")
    }], unexpected=[${unexpected.join(", ")}]`,
  );
}

/** Describe the exact public methods emitted for an OpenAPI document. */
export function describeClientOperations(document: OpenApiDocument): ClientOperationDescriptor[] {
  const operations = collectOperations(document);
  const names = allocateOperationNames(operations);
  return operations.map((operation) => ({
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

export function generatedClientClassName(provider: string): string {
  return namesForProvider(provider).className;
}

async function readSpecManifest(file: URL): Promise<RestClientSpecManifest> {
  const value: unknown = JSON.parse(await Deno.readTextFile(file));
  const manifest = asObject(value);
  const providers = asObject(manifest?.providers);
  if (manifest?.schemaVersion !== 1 || providers === undefined) {
    throw new Error(`Invalid API specification manifest ${file.pathname}`);
  }

  const parsedProviders: RestClientSpecManifest["providers"] = {};
  for (const [provider, providerValue] of objectEntries(providers)) {
    const providerManifest = asObject(providerValue);
    const selected = asString(providerManifest?.selected);
    const versions = asObject(providerManifest?.versions);
    if (selected === undefined || versions === undefined || !(selected in versions)) {
      throw new Error(`Invalid API specification manifest provider ${provider}`);
    }
    const parsedVersions: Record<string, { destination: string }> = {};
    for (const [version, versionValue] of objectEntries(versions)) {
      const destination = asString(asObject(versionValue)?.destination);
      if (destination === undefined) {
        throw new Error(`Invalid API specification manifest version ${provider} ${version}`);
      }
      parsedVersions[version] = { destination };
    }
    parsedProviders[provider] = { selected, versions: parsedVersions };
  }
  return { schemaVersion: 1, providers: parsedProviders };
}

export function renderProviderClient(
  provider: string,
  document: OpenApiDocument,
  options: RenderProviderClientOptions = {},
): string {
  const names = namesForProvider(provider);
  const operations = collectOperations(document);
  const operationNames = allocateOperationNames(
    operations,
    new Map(Object.entries(options.lockedNames?.methods ?? {})),
  );
  const operationsName = `${names.variablePrefix}Operations`;
  const securitySchemesName = `${names.variablePrefix}SecuritySchemes`;
  const serversName = `${names.variablePrefix}Servers`;
  const topLevelReserved = new Set([
    "AnyRestResponse",
    "Array",
    "ArrayBuffer",
    "Awaited",
    "BigInt",
    "Blob",
    "Boolean",
    "Capitalize",
    "ConstructorParameters",
    "Date",
    "Error",
    "Exclude",
    "Extract",
    "File",
    "FormData",
    "Headers",
    "InstanceType",
    "Lowercase",
    "Map",
    "NoInfer",
    "NonNullable",
    "Number",
    "Object",
    "Omit",
    "Parameters",
    "Partial",
    "Pick",
    "Promise",
    "ReadableStream",
    "Readonly",
    "Record",
    "Request",
    "Required",
    "Response",
    "ReturnType",
    "RestBinary",
    "RestBody",
    "RestClient",
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
    "Set",
    "String",
    "Symbol",
    "ThisParameterType",
    "Uncapitalize",
    "Uppercase",
    "URL",
    "URLSearchParams",
    "Uint8Array",
    "deepFreezeRestOperations",
    names.className,
    operationsName,
    securitySchemesName,
    serversName,
  ]);
  const schemas = componentSchemas(document);
  const symbolRequests = [
    ...[...schemas.keys()].map((name) => ({ key: `schema:${name}`, preferred: name })),
    ...operations.flatMap((operation) => {
      const methodName = operationNames.get(operation.key) ?? "operation";
      const base = toIdentifier(methodName, "pascal");
      return [
        { key: `input:${operation.key}`, preferred: `${base}Input` },
        { key: `response:${operation.key}`, preferred: `${base}Response` },
      ];
    }),
  ];
  const symbols = allocateNames(
    symbolRequests,
    "pascal",
    topLevelReserved,
    96,
    new Map(Object.entries(options.lockedNames?.symbols ?? {})),
  );
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
    "This file is generated. Edit the OpenAPI normalizer or generator instead.",
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
  const binaryImport =
    `${componentDeclarations}\n${operationTypeDeclarations}`.includes("RestBinary")
      ? "  type RestBinary,\n"
      : "";
  const int64Import = `${componentDeclarations}\n${operationTypeDeclarations}`.includes("RestInt64")
    ? "  type RestInt64,\n"
    : "";
  const jsonNumberImport = `${componentDeclarations}\n${operationTypeDeclarations}`.includes(
      "RestJsonNumber",
    )
    ? "  type RestJsonNumber,\n"
    : "";
  const jsonValueImport = `${componentDeclarations}\n${operationTypeDeclarations}`.includes(
      "RestJsonValue",
    )
    ? "  type RestJsonValue,\n"
    : "";
  const requestValueImport = `${componentDeclarations}\n${operationTypeDeclarations}`.includes(
      "RestRequestValue",
    )
    ? "  type RestRequestValue,\n"
    : "";
  const statusImports = `${componentDeclarations}\n${operationTypeDeclarations}`.includes(
      "RestHttpStatus",
    )
    ? "  type RestHttpStatus,\n  type RestSuccessfulStatus,\n"
    : "";

  return `${header}

import {
${binaryImport}${int64Import}${jsonNumberImport}${jsonValueImport}${requestValueImport}${statusImports}  type RestBody,
  RestClient,
  type RestClientOptions,
  type RestGeneratedRequestOptions,
  type RestOperation,
  type RestResponse,
  type RestUndocumentedResponse,
  deepFreezeRestOperations,
  deepFreezeRestMetadata,
} from ${JSON.stringify(options.restModulePath ?? "../rest.ts")};

export const ${serversName} = deepFreezeRestMetadata(${JSON.stringify(rootServers)} as const);

/** Provider-native OpenAPI security schemes retained as immutable metadata. */
export const ${securitySchemesName} = deepFreezeRestMetadata(${
    JSON.stringify(securitySchemes)
  } as const);

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

function collectOperations(document: OpenApiDocument): OperationModel[] {
  const operations: OperationModel[] = [];
  const pathCollections: [string, JsonObject][] = [
    ["paths", document.paths],
    ...((asObject(document["x-ms-paths"])) === undefined
      ? []
      : [["x-ms-paths", asObject(document["x-ms-paths"])!]] as [string, JsonObject][]),
  ];

  for (const [collectionName, paths] of pathCollections) {
    for (const [rawPath, pathValue] of objectEntries(paths)) {
      const pathItem = resolveObject(document, pathValue);
      if (pathItem === undefined) {
        throw new Error(`${collectionName}.${rawPath} is not a valid path item`);
      }
      if (pathItem.trace !== undefined) {
        throw new Error(`${collectionName}.${rawPath}.trace is unsupported`);
      }
      for (const method of httpMethods) {
        if (pathItem[method] === undefined) continue;
        const operation = resolveObject(document, pathItem[method]);
        if (operation === undefined) {
          throw new Error(`${collectionName}.${rawPath}.${method} is not a valid operation`);
        }
        operations.push(
          buildOperation(document, collectionName, rawPath, method, pathItem, operation),
        );
      }
    }
  }
  return operations.toSorted((left, right) => compareText(left.key, right.key));
}

function allocateOperationNames(
  operations: readonly OperationModel[],
  locked: ReadonlyMap<string, string> = new Map(),
): ReadonlyMap<string, string> {
  return allocateNames(
    operations.map((operation) => ({ key: operation.key, preferred: operation.operationId })),
    "camel",
    new Set(["catch", "constructor", "finally", "rest", "then"]),
    96,
    locked,
  );
}

function buildOperation(
  document: OpenApiDocument,
  collectionName: string,
  rawPath: string,
  method: OpenApiHttpMethod,
  pathItem: JsonObject,
  operation: JsonObject,
): OperationModel {
  const normalizedPath = normalizePath(rawPath, collectionName === "x-ms-paths");
  const key = `${collectionName}:${method}:${rawPath}`;
  const operationId = asString(operation.operationId) ?? `${method} ${normalizedPath.path}`;
  const parameters = collectParameters(
    document,
    pathItem.parameters,
    operation.parameters,
    normalizedPath.path,
    normalizedPath.multiSegmentParameters,
    normalizedPath.optionalPathParameters,
  );
  const body = collectRequestBody(document, operation.requestBody);
  const responses = collectResponses(document, operation.responses);
  const tags = Array.isArray(operation.tags)
    ? operation.tags.filter((tag): tag is string => typeof tag === "string").toSorted(compareText)
    : [];
  const externalDocs = asString(asObject(operation.externalDocs)?.url);
  if (objectEntries(operation.callbacks).length > 0) {
    throw new Error(`${method.toUpperCase()} ${normalizedPath.path} uses unsupported callbacks`);
  }
  return {
    key,
    operationId,
    method: method.toUpperCase() as Uppercase<OpenApiHttpMethod>,
    path: normalizedPath.path,
    pathGroups: normalizedPath.pathGroups,
    summary: asString(operation.summary),
    description: asString(operation.description),
    deprecated: asBoolean(operation.deprecated),
    externalDocs,
    tags,
    parameters,
    body,
    responses,
    security: collectSecurityRequirements(
      Object.hasOwn(operation, "security") ? operation.security : document.security,
      `${method.toUpperCase()} ${normalizedPath.path}`,
    ),
    server: firstServerUrl(operation.servers) ?? firstServerUrl(pathItem.servers),
  };
}

function normalizePath(
  rawPath: string,
  hasEmbeddedQuery: boolean,
): {
  path: string;
  pathGroups: readonly PathGroupModel[];
  multiSegmentParameters: ReadonlySet<string>;
  optionalPathParameters: ReadonlySet<string>;
} {
  const sourcePath = hasEmbeddedQuery ? rawPath.split("?", 1)[0] : rawPath;
  const parts: Array<{ group: boolean; text: string }> = [];
  let text = "";
  let group = false;
  for (let index = 0; index < sourcePath.length; index++) {
    const character = sourcePath[index];
    const escaped = character === "\\" && ["(", ")"].includes(sourcePath[index + 1] ?? "");
    if (escaped) {
      text += sourcePath[++index];
    } else if (character === "(") {
      if (group) throw new Error(`${rawPath} contains a nested optional path group`);
      if (text !== "") parts.push({ group: false, text });
      text = "";
      group = true;
    } else if (character === ")") {
      if (!group) throw new Error(`${rawPath} contains an unmatched optional path group close`);
      parts.push({ group: true, text });
      text = "";
      group = false;
    } else {
      text += character;
    }
  }
  if (group) throw new Error(`${rawPath} contains an unclosed optional path group`);
  if (text !== "") parts.push({ group: false, text });

  const multiSegmentParameters = new Set<string>();
  const normalizedParts = parts.map((part) => {
    const normalizedText = part.text.replaceAll(
      /\*([A-Za-z_][A-Za-z\d_]*)/g,
      (_placeholder, name: string) => {
        multiSegmentParameters.add(name);
        return `{${name}}`;
      },
    );
    return {
      ...part,
      text: normalizedText,
      parameters: uniqueStrings(
        [...normalizedText.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]),
      ),
    };
  });
  const groupParameters = normalizedParts.map((part, index): readonly string[] => {
    if (!part.group || part.parameters.length > 0) return part.parameters;
    const next = normalizedParts[index + 1];
    if (next?.group && next.parameters.length > 0) return next.parameters;
    const previous = normalizedParts[index - 1];
    return previous?.group && previous.parameters.length > 0 ? previous.parameters : [];
  });

  let path = sourcePath.startsWith("/") ? "" : "/";
  const pathGroups: PathGroupModel[] = [];
  let pathGroupIndex = 0;
  for (const [index, part] of normalizedParts.entries()) {
    const start = path.length;
    for (const character of part.text) {
      if (character !== "/" || !path.endsWith("/")) path += character;
    }
    if (part.group) {
      if (start === path.length) {
        throw new Error(`${rawPath} contains an empty optional path group`);
      }
      const parameters = groupParameters[index];
      pathGroups.push(
        parameters.length > 0 ? { start, end: path.length, parameters } : {
          start,
          end: path.length,
          selector: String(pathGroupIndex),
          defaultIncluded: true,
        },
      );
      pathGroupIndex++;
    }
  }
  const optionalPathParameters = new Set(
    pathGroups.flatMap((value) => value.parameters ?? []),
  );
  return { path, pathGroups, multiSegmentParameters, optionalPathParameters };
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values)];
}

function collectParameters(
  document: OpenApiDocument,
  pathParameters: unknown,
  operationParameters: unknown,
  path: string,
  wildcardParameters: ReadonlySet<string>,
  optionalPathParameters: ReadonlySet<string>,
): ParameterModel[] {
  const parameterMap = new Map<string, ParameterModel>();
  if (pathParameters !== undefined && !Array.isArray(pathParameters)) {
    throw new Error(`${path} path-level parameters must be an array`);
  }
  if (operationParameters !== undefined && !Array.isArray(operationParameters)) {
    throw new Error(`${path} operation parameters must be an array`);
  }
  assertNoDuplicateParameters(document, pathParameters, `${path} path-level`);
  assertNoDuplicateParameters(document, operationParameters, `${path} operation`);
  for (
    const value of [
      ...(Array.isArray(pathParameters) ? pathParameters : []),
      ...(Array.isArray(operationParameters) ? operationParameters : []),
    ]
  ) {
    const parameter = resolveObject(document, value);
    if (parameter === undefined) {
      throw new Error(`${path} contains an invalid parameter`);
    }
    const location = asString(parameter?.in);
    const name = asString(parameter?.name);
    if (name === undefined || location === undefined) {
      throw new Error(`${path} contains a parameter without string name/in`);
    }
    if (location === "cookie") {
      throw new Error(`${path} parameter ${name} uses unsupported cookie location`);
    }
    if (location !== "header" && location !== "path" && location !== "query") {
      throw new Error(`${path} parameter ${name} uses unsupported location ${location}`);
    }
    if (parameter.schema === undefined) {
      throw new Error(`${path} parameter ${name} has no supported schema`);
    }
    const style = asString(parameter.style);
    const explode = asBoolean(parameter.explode);
    const allowReserved = asBoolean(parameter.allowReserved);
    if (allowReserved === true) {
      throw new Error(`${path} parameter ${name} uses unsupported allowReserved serialization`);
    }
    if (
      (location === "path" || location === "header") &&
      ((style !== undefined && style !== "simple") || explode === true)
    ) {
      throw new Error(`${path} parameter ${name} uses unsupported ${location} serialization`);
    }
    if (
      (location === "path" || location === "header") &&
      !parameterSchemaIsPrimitive(document, parameter.schema)
    ) {
      throw new Error(`${path} parameter ${name} uses unsupported ${location} collection schema`);
    }
    if (
      location === "query" && style !== undefined &&
      !["deepObject", "form", "pipeDelimited", "spaceDelimited"].includes(style)
    ) {
      throw new Error(`${path} parameter ${name} uses unsupported query style ${style}`);
    }
    if (location === "query" && style === "deepObject") {
      if (explode !== true) {
        throw new Error(`${path} deepObject query parameter ${name} requires explode: true`);
      }
      if (!parameterSchemaIsFlatPrimitiveObject(document, parameter.schema)) {
        throw new Error(
          `${path} deepObject query parameter ${name} requires a closed flat primitive object schema`,
        );
      }
    }
    parameterMap.set(`${location}:${name}`, {
      name,
      location,
      required: location === "path"
        ? !optionalPathParameters.has(name)
        : asBoolean(parameter.required) === true,
      schema: parameter.schema,
      description: asString(parameter.description),
      deprecated: asBoolean(parameter.deprecated),
      style,
      explode,
      allowReserved,
      multiSegment: location === "path" &&
        (asBoolean(parameter["x-multi-segment"]) || wildcardParameters.has(name)),
    });
  }

  const pathCaptures = new Set([...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]));
  for (const name of pathCaptures) {
    if (!parameterMap.has(`path:${name}`)) {
      parameterMap.set(`path:${name}`, {
        name,
        location: "path",
        required: !optionalPathParameters.has(name),
        schema: { type: "string" },
        description:
          "Path capture synthesized from an upstream route missing its parameter object.",
        multiSegment: wildcardParameters.has(name),
      });
    }
  }
  for (const parameter of parameterMap.values()) {
    if (parameter.location === "path" && !pathCaptures.has(parameter.name)) {
      throw new Error(`${path} path parameter ${parameter.name} has no matching path capture`);
    }
  }
  return [...parameterMap.values()].toSorted((left, right) =>
    compareText(`${left.location}:${left.name}`, `${right.location}:${right.name}`)
  );
}

function assertNoDuplicateParameters(
  document: OpenApiDocument,
  values: unknown,
  location: string,
): void {
  if (!Array.isArray(values)) return;
  const seen = new Set<string>();
  for (const value of values) {
    const parameter = resolveObject(document, value);
    const parameterLocation = asString(parameter?.in);
    const name = asString(parameter?.name);
    if (parameterLocation === undefined || name === undefined) continue;
    const key = `${parameterLocation}:${name}`;
    if (seen.has(key)) throw new Error(`${location} parameters contain duplicate ${key}`);
    seen.add(key);
  }
}

function parameterSchemaIsPrimitive(document: OpenApiDocument, value: unknown): boolean {
  const schema = resolveObject(document, value);
  if (schema === undefined) return false;
  if (Object.hasOwn(schema, "const")) return isPrimitiveSchemaValue(schema.const);
  if (
    Array.isArray(schema.enum) && schema.enum.length > 0 &&
    schema.enum.every(isPrimitiveSchemaValue)
  ) {
    return true;
  }
  const type = asString(schema.type);
  if (["boolean", "integer", "number", "string"].includes(type ?? "")) return true;
  for (const keyword of ["oneOf", "anyOf"] as const) {
    const members = schema[keyword];
    if (
      Array.isArray(members) && members.length > 0 &&
      members.every((member) => parameterSchemaIsPrimitive(document, member))
    ) {
      return true;
    }
  }
  return false;
}

function parameterSchemaIsFlatPrimitiveObject(
  document: OpenApiDocument,
  value: unknown,
): boolean {
  const schema = resolveObject(document, value);
  if (
    schema === undefined || asBoolean(schema.nullable) === true ||
    (asString(schema.type) !== "object" && asObject(schema.properties) === undefined &&
      schema.additionalProperties === undefined) ||
    ["allOf", "anyOf", "oneOf", "not"].some((keyword) => schema[keyword] !== undefined)
  ) {
    return false;
  }
  if (
    objectEntries(schema.properties).some(([, property]) =>
      !parameterSchemaIsPrimitive(document, property)
    )
  ) {
    return false;
  }
  if (schema.additionalProperties === false) return true;
  return asObject(schema.additionalProperties) !== undefined &&
    parameterSchemaIsPrimitive(document, schema.additionalProperties);
}

function isPrimitiveSchemaValue(value: unknown): boolean {
  return value === null || ["boolean", "number", "string"].includes(typeof value);
}

function collectRequestBody(document: OpenApiDocument, value: unknown): BodyModel | undefined {
  if (value === undefined) return undefined;
  const body = resolveObject(document, value);
  if (body === undefined) throw new Error("Request body is not a valid object or reference");
  const content = collectMedia(body.content, "request");
  if (content.length === 0) throw new Error("Request body has no media content");
  return {
    required: asBoolean(body.required) === true,
    description: asString(body.description),
    content,
  };
}

function collectResponses(document: OpenApiDocument, value: unknown): ResponseModel[] {
  const entries = objectEntries(value);
  if (entries.length === 0) throw new Error("Operation has no valid responses object");
  return entries.map(([statusValue, responseValue]) => {
    const response = resolveObject(document, responseValue);
    const status = statusValue === "default" ? "default" : Number(statusValue);
    if (response === undefined) throw new Error(`Response ${statusValue} is invalid`);
    if (status !== "default" && !Number.isInteger(status)) {
      throw new Error(`Unsupported response status ${statusValue}`);
    }
    if (objectEntries(response.links).length > 0) {
      throw new Error(`Response ${statusValue} uses unsupported links`);
    }
    return {
      status,
      description: asString(response.description),
      content: collectMedia(response.content, "response"),
      headers: collectResponseHeaders(document, response.headers, statusValue),
    } satisfies ResponseModel;
  }).toSorted((left, right) => {
    if (left.status === "default") return right.status === "default" ? 0 : 1;
    if (right.status === "default") return -1;
    return left.status - right.status;
  });
}

function collectMedia(value: unknown, kind: "request" | "response"): MediaModel[] {
  if (value === undefined) return [];
  const entries = objectEntries(value);
  if (entries.length === 0) throw new Error(`${kind} content must be a non-empty object`);
  const content = entries.map(([mediaType, mediaValue]) => {
    const essence = mediaTypeEssence(mediaType);
    if (essence === "" || !essence.includes("/") || essence.includes("*")) {
      throw new Error(`${kind} media ${mediaType} has an unsupported media type`);
    }
    const media = asObject(mediaValue);
    if (media === undefined) throw new Error(`${kind} media ${mediaType} is invalid`);
    if (kind === "request" && media.encoding !== undefined) {
      throw new Error(`Request media ${mediaType} uses unsupported encoding metadata`);
    }
    return { mediaType, schema: media.schema };
  }).toSorted((left, right) => compareMediaTypes(left.mediaType, right.mediaType));
  const seenEssences = new Map<string, string>();
  for (const media of content) {
    const essence = mediaTypeEssence(media.mediaType);
    const previous = seenEssences.get(essence);
    if (previous !== undefined) {
      throw new Error(
        `${kind} media ${media.mediaType} duplicates normalized media type ${previous}`,
      );
    }
    seenEssences.set(essence, media.mediaType);
  }
  return content;
}

function collectResponseHeaders(
  document: OpenApiDocument,
  value: unknown,
  status: string,
): string[] {
  if (value === undefined) return [];
  if (asObject(value) === undefined) {
    throw new Error(`Response ${status} headers must be an object`);
  }
  return objectEntries(value).map(([name, headerValue]) => {
    if (resolveObject(document, headerValue) === undefined) {
      throw new Error(`Response ${status} header ${name} is invalid`);
    }
    return name;
  }).toSorted(compareText);
}

function collectSecuritySchemes(document: OpenApiDocument): Record<string, JsonObject> {
  const value = asObject(document.components)?.securitySchemes;
  if (value === undefined) return {};
  if (asObject(value) === undefined) {
    throw new Error("components.securitySchemes must be an object");
  }
  return Object.fromEntries(
    objectEntries(value).map(([name, schemeValue]) => {
      const scheme = resolveObject(document, schemeValue);
      if (scheme === undefined) throw new Error(`Security scheme ${name} is invalid`);
      return [name, scheme];
    }),
  );
}

function collectSecurityRequirements(
  value: unknown,
  location: string,
): readonly SecurityRequirementModel[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new Error(`${location} security must be an array`);
  return value.map((requirementValue, index) => {
    const requirement = asObject(requirementValue);
    if (requirement === undefined) {
      throw new Error(`${location} security requirement ${index} must be an object`);
    }
    return Object.fromEntries(
      objectEntries(requirement).map(([scheme, scopesValue]) => {
        if (
          !Array.isArray(scopesValue) ||
          !scopesValue.every((scope): scope is string => typeof scope === "string")
        ) {
          throw new Error(`${location} security requirement ${scheme} scopes must be strings`);
        }
        return [scheme, [...scopesValue].toSorted(compareText)];
      }),
    );
  });
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

function operationInputIsOptional(operation: OperationModel): boolean {
  return !operation.parameters.some((parameter) => parameter.required) &&
    operation.body?.required !== true;
}

function renderGeneratedModule(manifest: RestClientSpecManifest): string {
  const providers = Object.keys(manifest.providers).toSorted(compareText);
  const versions = Object.fromEntries(
    providers.map((provider) => [
      provider,
      Object.keys(manifest.providers[provider].versions).toSorted(compareText),
    ]),
  );
  const typeMap = providers.map((provider) => {
    const className = namesForProvider(provider).className;
    const entries = versions[provider].map((version) =>
      `    ${JSON.stringify(version)}: import(${
        JSON.stringify(`./${provider}/${version}.ts`)
      }).${className};`
    );
    return `  ${JSON.stringify(provider)}: {\n${entries.join("\n")}\n  };`;
  });
  const loaders = providers.map((provider) => {
    const className = namesForProvider(provider).className;
    const entries = versions[provider].map((version) =>
      `    ${JSON.stringify(version)}: async (options) => new (await import(${
        JSON.stringify(`./${provider}/${version}.ts`)
      })).${className}(options),`
    );
    return `  ${JSON.stringify(provider)}: {\n${entries.join("\n")}\n  },`;
  });

  return `/** Generated, strongly typed lazy loader for provider REST client versions. */
import type { RestClient, RestClientOptions } from "../rest.ts";

export const restClientVersions = ${JSON.stringify(versions)} as const;

export type RestClientProvider = keyof RestClientTypeMap;
export type RestClientVersion<TProvider extends RestClientProvider> =
  keyof RestClientTypeMap[TProvider] & string;

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

function namesForProvider(provider: string): ProviderNames {
  const configured = providerNames[provider];
  if (configured !== undefined) return configured;
  const name = toIdentifier(provider, "pascal");
  return {
    className: `${name}RestClient`,
    displayName: name,
    namespaceName: `${name}Api`,
    variablePrefix: toIdentifier(provider, "camel"),
  };
}

function requiredName(names: ReadonlyMap<string, string>, key: string): string {
  const name = names.get(key);
  if (name === undefined) throw new Error(`Missing generated name for ${key}`);
  return name;
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

function responseDecodeMode(media: MediaModel): "binary" | "json" | "text" {
  if (isBinaryMediaType(media.mediaType)) return "binary";
  if (isResponseJsonMediaType(media.mediaType)) return "json";
  if (isTextMediaType(media.mediaType) || schemaIsText(media.schema)) return "text";
  return "binary";
}

function isStandardJsonMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  return value === "application/json" || value.endsWith("+json") || value.includes("/json");
}

function isResponseJsonMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  // GitHub documents this response representation as object+JSON, despite its legacy media key.
  return value === "application/vnd.github.object" || isStandardJsonMediaType(value);
}

function isFormMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  return value === "application/x-www-form-urlencoded" || value.startsWith("multipart/");
}

function isTextMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  return value.startsWith("text/") || value.includes("xml") || value.includes("yaml") ||
    value.includes("yml");
}

function isBinaryMediaType(mediaType: string): boolean {
  const value = mediaTypeEssence(mediaType);
  return value.startsWith("multipart/") || value.startsWith("image/") ||
    value.startsWith("audio/") || value.startsWith("video/") || value.startsWith("font/") ||
    value === "application/octet-stream" || value.includes("zip") || value.includes("gzip") ||
    value === "application/pdf";
}

function mediaTypeEssence(mediaType: string): string {
  return mediaType.split(";", 1)[0].trim().toLowerCase();
}

function schemaIsText(value: unknown): boolean {
  const schema = asObject(value);
  if (schema === undefined) return false;
  const type = asString(schema.type);
  const format = asString(schema.format)?.toLowerCase();
  if ((type === "string" || type === "text") && format !== "binary" && format !== "byte") {
    return true;
  }
  return Array.isArray(schema.enum) && schema.enum.length > 0 &&
    schema.enum.every((member) => typeof member === "string");
}

function compareMediaTypes(left: string, right: string): number {
  return mediaTypePriority(left) - mediaTypePriority(right) || compareText(left, right);
}

function mediaTypePriority(mediaType: string): number {
  const essence = mediaTypeEssence(mediaType);
  if (essence === "application/json") return 0;
  if (essence.endsWith("+json") || essence.includes("json")) return 1;
  if (essence.startsWith("text/")) return 2;
  return 3;
}

function indentContinuation(value: string, spaces: number): string {
  const indent = " ".repeat(spaces);
  return value.replaceAll("\n", `\n${indent}`);
}

async function readPublicNamesManifest(
  file: URL,
  allowMissing: boolean,
): Promise<RestClientPublicNamesManifest> {
  let value: unknown;
  try {
    value = JSON.parse(await Deno.readTextFile(file));
  } catch (error) {
    if (allowMissing && error instanceof Deno.errors.NotFound) {
      return { version: 1, providers: {} };
    }
    throw error;
  }
  const manifest = asObject(value);
  const providers = asObject(manifest?.providers);
  if (manifest?.version !== 1 || providers === undefined) {
    throw new Error(`Invalid public-name manifest ${file.pathname}`);
  }
  const normalizedProviders: Record<string, ProviderPublicNames> = {};
  for (const [provider, providerValue] of objectEntries(providers)) {
    const providerNames = asObject(providerValue);
    const methods = stringRecord(providerNames?.methods, `${provider}.methods`);
    const symbols = stringRecord(providerNames?.symbols, `${provider}.symbols`);
    normalizedProviders[provider] = { methods, symbols };
  }
  return { version: 1, providers: sortRecord(normalizedProviders) };
}

function stringRecord(value: unknown, label: string): Readonly<Record<string, string>> {
  const object = asObject(value);
  if (object === undefined) throw new Error(`Invalid public-name manifest record ${label}`);
  const result: Record<string, string> = {};
  for (const [key, entry] of objectEntries(object)) {
    if (typeof entry !== "string") {
      throw new Error(`Invalid public-name manifest value ${label}.${key}`);
    }
    result[key] = entry;
  }
  return sortRecord(result);
}

function assertPublicNamesCurrent(
  expected: RestClientPublicNamesManifest,
  actual: RestClientPublicNamesManifest,
): void {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return;
  throw new Error(
    "Generated public names differ from codegen/generator/public-names.json; review the API change and run the explicit public-name update task",
  );
}

function sortRecord<T>(value: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).toSorted(([left], [right]) => compareText(left, right)),
  );
}

async function formatGeneratedSources(
  sources: ReadonlyMap<string, string>,
): Promise<ReadonlyMap<string, string>> {
  const formatted = new Map<string, string>();
  for (
    const [name, source] of [...sources.entries()].toSorted(([left], [right]) =>
      compareText(left, right)
    )
  ) {
    const command = new Deno.Command(Deno.execPath(), {
      args: ["fmt", "--config", decodeURIComponent(denoConfiguration.pathname), "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    const child = command.spawn();
    const writer = child.stdin.getWriter();
    await writer.write(new TextEncoder().encode(source));
    await writer.close();
    const output = await child.output();
    if (!output.success) {
      throw new Error(
        `Failed to format generated ${name}: ${new TextDecoder().decode(output.stderr).trim()}`,
      );
    }
    formatted.set(name, new TextDecoder().decode(output.stdout));
  }
  return formatted;
}

async function assertGeneratedSourcesCurrent(
  directory: URL,
  expected: ReadonlyMap<string, string>,
): Promise<void> {
  const failures: string[] = [];
  let actualNames: Set<string>;
  try {
    actualNames = new Set(await generatedSourceNames(directory));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Generated client directory is missing: ${directory.pathname}`);
    }
    throw error;
  }
  for (const name of actualNames) {
    if (!expected.has(name)) failures.push(`unexpected output ${name}`);
  }
  for (const [name, source] of expected) {
    if (!actualNames.has(name)) {
      failures.push(`missing output ${name}`);
      continue;
    }
    const actual = await Deno.readTextFile(new URL(name, directory));
    if (actual !== source) failures.push(`stale output ${name}`);
  }
  if (failures.length > 0) {
    throw new Error(`Generated REST clients are not current:\n${failures.join("\n")}`);
  }
}

type GeneratedDirectoryReplacementOptions = {
  /** Test-only failure injection after the generated tree swap and before the manifest swap. */
  afterGeneratedSwap?: () => Promise<void> | void;
  manifest?: { file: URL; source: string };
  validate?: (stage: URL) => Promise<void>;
};

/** Stage, validate, and transactionally replace a complete generated source tree. */
export async function replaceGeneratedDirectory(
  directory: URL,
  sources: ReadonlyMap<string, string>,
  options: GeneratedDirectoryReplacementOptions = {},
): Promise<void> {
  const parent = new URL("../", directory);
  await Deno.mkdir(parent, { recursive: true });
  const nonce = crypto.randomUUID();
  const stage = new URL(`.generated-stage-${nonce}/`, parent);
  const backup = new URL(`.generated-backup-${nonce}/`, parent);
  const manifestStage = options.manifest === undefined
    ? undefined
    : new URL(`.public-names-stage-${nonce}.json`, options.manifest.file);
  const manifestBackup = options.manifest === undefined
    ? undefined
    : new URL(`.public-names-backup-${nonce}.json`, options.manifest.file);
  const hadCurrent = await pathExists(directory);
  const hadManifest = options.manifest !== undefined && await pathExists(options.manifest.file);

  await Deno.mkdir(stage);
  try {
    for (const [name, source] of sources) {
      const destination = new URL(name, stage);
      await Deno.mkdir(new URL("./", destination), { recursive: true });
      await Deno.writeTextFile(destination, source, { createNew: true });
    }
    if (manifestStage !== undefined && options.manifest !== undefined) {
      await Deno.writeTextFile(manifestStage, options.manifest.source, { createNew: true });
    }
    await (options.validate ?? typeCheckGeneratedDirectory)(stage);

    let movedCurrent = false;
    let movedStage = false;
    let movedManifestCurrent = false;
    let movedManifestStage = false;
    try {
      if (hadCurrent) {
        await Deno.rename(directory, backup);
        movedCurrent = true;
      }
      if (hadManifest && options.manifest !== undefined && manifestBackup !== undefined) {
        await Deno.rename(options.manifest.file, manifestBackup);
        movedManifestCurrent = true;
      }
      await Deno.rename(stage, directory);
      movedStage = true;
      await options.afterGeneratedSwap?.();
      if (manifestStage !== undefined && options.manifest !== undefined) {
        await Deno.rename(manifestStage, options.manifest.file);
        movedManifestStage = true;
      }
    } catch (error) {
      const rollbackErrors: unknown[] = [];
      if (movedManifestStage && options.manifest !== undefined) {
        try {
          await Deno.remove(options.manifest.file);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (movedStage && await pathExists(directory)) {
        try {
          await Deno.remove(directory, { recursive: true });
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (
        movedManifestCurrent && options.manifest !== undefined && manifestBackup !== undefined &&
        await pathExists(manifestBackup)
      ) {
        try {
          await Deno.rename(manifestBackup, options.manifest.file);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (movedCurrent && await pathExists(backup)) {
        try {
          await Deno.rename(backup, directory);
        } catch (rollbackError) {
          rollbackErrors.push(rollbackError);
        }
      }
      if (rollbackErrors.length > 0) throw new AggregateError([error, ...rollbackErrors]);
      throw error;
    }
    if (movedCurrent) await Deno.remove(backup, { recursive: true });
    if (movedManifestCurrent && manifestBackup !== undefined) await Deno.remove(manifestBackup);
  } finally {
    if (await pathExists(stage)) await Deno.remove(stage, { recursive: true });
    if (manifestStage !== undefined && await pathExists(manifestStage)) {
      await Deno.remove(manifestStage);
    }
  }
}

async function validateGeneratedSources(
  directory: URL,
  sources: ReadonlyMap<string, string>,
): Promise<void> {
  const parent = new URL("../", directory);
  const stage = new URL(`.generated-validation-${crypto.randomUUID()}/`, parent);
  await Deno.mkdir(stage);
  try {
    for (const [name, source] of sources) {
      const destination = new URL(name, stage);
      await Deno.mkdir(new URL("./", destination), { recursive: true });
      await Deno.writeTextFile(destination, source, { createNew: true });
    }
    await typeCheckGeneratedDirectory(stage);
  } finally {
    if (await pathExists(stage)) await Deno.remove(stage, { recursive: true });
  }
}

async function typeCheckGeneratedDirectory(directory: URL): Promise<void> {
  const sourceNames = await generatedSourceNames(directory);
  const output = await new Deno.Command(Deno.execPath(), {
    args: [
      "check",
      "--config",
      decodeURIComponent(denoConfiguration.pathname),
      ...sourceNames.map((name) => decodeURIComponent(new URL(name, directory).pathname)),
    ],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!output.success) {
    throw new Error(
      `Staged generated REST clients failed type-check:\n${
        new TextDecoder().decode(output.stderr).trim()
      }`,
    );
  }
}

async function generatedSourceNames(directory: URL, prefix = ""): Promise<string[]> {
  const names: string[] = [];
  const entries = [];
  for await (const entry of Deno.readDir(directory)) entries.push(entry);
  for (const entry of entries.toSorted((left, right) => compareText(left.name, right.name))) {
    const name = `${prefix}${entry.name}`;
    if (entry.isDirectory) {
      names.push(...await generatedSourceNames(new URL(`${entry.name}/`, directory), `${name}/`));
    } else if (entry.isFile && entry.name.endsWith(".ts")) {
      names.push(name);
    }
  }
  return names;
}

async function pathExists(path: URL): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

if (import.meta.main) {
  const unknownArguments = Deno.args.filter((argument) =>
    argument !== "--check" && argument !== "--update-public-names"
  );
  if (unknownArguments.length > 0) {
    throw new Error(`Unknown generator arguments: ${unknownArguments.join(", ")}`);
  }
  await generateRestClients({
    check: Deno.args.includes("--check"),
    updatePublicNames: Deno.args.includes("--update-public-names"),
  });
}
