/** OpenAPI manifests and reviewed public names define the generated clients' stable API. */
import { gitHostOpenApiSources } from "./openapi-specifications/openapi-source-catalog.ts";
import { generatedRestClientArtifact } from "./generated-rest-client-paths.ts";
import { allocateNames, compareText, toIdentifier } from "./naming.ts";
import { asObject, asString, componentSchemas, objectEntries } from "./openapi.ts";
import type { OpenApiDocument } from "./openapi.ts";
import type { OperationModel } from "./operations.ts";

export type ProviderNames = {
  className: string;
  displayName: string;
  namespaceName: string;
  variablePrefix: string;
};

export type ProviderPublicNames = {
  methods: Readonly<Record<string, string>>;
  symbols: Readonly<Record<string, string>>;
};

export type RestClientPublicNamesManifest = {
  providers: Readonly<Record<string, ProviderPublicNames>>;
  version: 1;
};

export type RestClientSpecManifest = {
  gitHosts: Record<string, {
    selected: string;
    client: ProviderNames;
    versions: Record<
      string,
      { destination: string; artifacts: { client: string; normalized: string } }
    >;
  }>;
  schemaVersion: 1;
};

const providerNames: Readonly<Record<string, ProviderNames>> = Object.fromEntries(
  Object.entries(gitHostOpenApiSources).map(([provider, source]) => [provider, source.client]),
);

/** Providers required for a complete checked generation. */
export const expectedRestClientProviders = Object.freeze(
  Object.keys(providerNames).toSorted(compareText),
);

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

export function generatedClientClassName(provider: string): string {
  return namesForProvider(provider).className;
}

export async function readSpecManifest(file: URL): Promise<RestClientSpecManifest> {
  const value: unknown = JSON.parse(await Deno.readTextFile(file));
  const manifest = asObject(value);
  const gitHosts = asObject(manifest?.gitHosts);
  if (manifest?.schemaVersion !== 1 || gitHosts === undefined) {
    throw new Error(`Invalid API specification manifest ${file.pathname}`);
  }

  const parsedGitHosts: RestClientSpecManifest["gitHosts"] = {};
  for (const [provider, providerValue] of objectEntries(gitHosts)) {
    const providerManifest = asObject(providerValue);
    const selected = asString(providerManifest?.selected);
    const versions = asObject(providerManifest?.versions);
    if (selected === undefined || versions === undefined || !(selected in versions)) {
      throw new Error(`Invalid API specification manifest provider ${provider}`);
    }
    const client = asObject(providerManifest?.client) as ProviderNames | undefined;
    if (client === undefined) throw new Error(`Missing client naming manifest for ${provider}`);
    const parsedVersions: RestClientSpecManifest["gitHosts"][string]["versions"] = {};
    for (const [version, versionValue] of objectEntries(versions)) {
      const destination = asString(asObject(versionValue)?.destination);
      if (destination === undefined) {
        throw new Error(`Invalid API specification manifest version ${provider} ${version}`);
      }
      const artifacts = asObject(asObject(versionValue)?.artifacts) as {
        client: string;
        normalized: string;
      } | undefined;
      const expectedClient = generatedRestClientArtifact(provider, version);
      if (
        artifacts === undefined || artifacts.client !== expectedClient ||
        !artifacts.normalized?.startsWith(
          "codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/",
        )
      ) throw new Error(`Missing generated artifact paths for ${provider} ${version}`);
      parsedVersions[version] = { destination, artifacts };
    }
    parsedGitHosts[provider] = { selected, client, versions: parsedVersions };
  }
  return { schemaVersion: 1, gitHosts: parsedGitHosts };
}

export function namesForProvider(provider: string): ProviderNames {
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

export function requiredName(names: ReadonlyMap<string, string>, key: string): string {
  const name = names.get(key);
  if (name === undefined) throw new Error(`Missing generated name for ${key}`);
  return name;
}

export function allocateOperationNames(
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

/** Allocate every client-level identifier under the reviewed public-name manifest. */
export function allocateClientNames(
  names: ProviderNames,
  document: OpenApiDocument,
  operations: readonly OperationModel[],
  lockedNames?: ProviderPublicNames,
) {
  const operationNames = allocateOperationNames(
    operations,
    new Map(Object.entries(lockedNames?.methods ?? {})),
  );
  const operationsName = `${names.variablePrefix}Operations`;
  const securitySchemesName = `${names.variablePrefix}SecuritySchemes`;
  const serversName = `${names.variablePrefix}Servers`;
  const serverDefinitionsName = `${names.variablePrefix}ServerDefinitions`;
  const securityDefinitionsName = `${names.variablePrefix}SecuritySchemeDefinitions`;
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
    serverDefinitionsName,
    securityDefinitionsName,
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
    new Map(Object.entries(lockedNames?.symbols ?? {})),
  );
  return {
    schemas,
    operationNames,
    symbols,
    operationsName,
    securitySchemesName,
    serversName,
    serverDefinitionsName,
    securityDefinitionsName,
  };
}

export async function readPublicNamesManifest(
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

export function assertPublicNamesCurrent(
  expected: RestClientPublicNamesManifest,
  actual: RestClientPublicNamesManifest,
): void {
  if (JSON.stringify(expected) === JSON.stringify(actual)) return;
  throw new Error(
    "Generated public names differ from codegen/pangit/raw-rest-client-generation/public-names.json; review the API change, then use deno task generate --update-public-names",
  );
}

export function sortRecord<T>(value: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(value).toSorted(([left], [right]) => compareText(left, right)),
  );
}
