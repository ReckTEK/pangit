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

export type LicensedSourceArtifact = {
  source: string;
  destination: string;
  bytes: number;
  sha256: string;
};

export type RestClientLicenseManifest = {
  spdx: "MIT";
  attribution: string;
  declaration: { name: string; url: string } | null;
  text: LicensedSourceArtifact;
  notices: readonly LicensedSourceArtifact[];
};

export type RestClientSpecManifest = {
  gitHosts: Record<string, {
    selected: string;
    client: ProviderNames;
    versions: Record<
      string,
      {
        source: string;
        destination: string;
        bytes: number;
        sha256: string;
        license: RestClientLicenseManifest | null;
        artifacts: { client: string; normalized: string };
      }
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
      const versionManifest = asObject(versionValue);
      const source = asString(versionManifest?.source);
      const destination = asString(versionManifest?.destination);
      const bytes = versionManifest?.bytes;
      const sha256 = asString(versionManifest?.sha256);
      if (
        !isHttpsUrl(source) || destination === undefined ||
        !Number.isSafeInteger(bytes) || (bytes as number) < 0 || !isSha256(sha256)
      ) {
        throw new Error(`Invalid API specification manifest version ${provider} ${version}`);
      }
      const artifacts = asObject(versionManifest?.artifacts) as {
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
      if (versionManifest === undefined || !("license" in versionManifest)) {
        throw new Error(`Missing license status for ${provider} ${version}`);
      }
      const license = versionManifest.license === null
        ? null
        : parseLicenseManifest(provider, version, versionManifest.license);
      parsedVersions[version] = {
        source,
        destination,
        bytes: bytes as number,
        sha256,
        license,
        artifacts,
      };
    }
    parsedGitHosts[provider] = { selected, client, versions: parsedVersions };
  }
  return { schemaVersion: 1, gitHosts: parsedGitHosts };
}

function parseLicenseManifest(
  provider: string,
  version: string,
  value: unknown,
): RestClientLicenseManifest {
  const license = asObject(value);
  const spdx = asString(license?.spdx);
  const attribution = asString(license?.attribution);
  if (spdx !== "MIT" || attribution === undefined || attribution.trim() === "") {
    throw new Error(`Provider ${provider} ${version} has invalid MIT license evidence`);
  }
  const prefix =
    `codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/licenses/${provider}/${version}/`;
  const text = parseLicensedSourceArtifact(license?.text, `${provider} ${version} license`, prefix);
  const untypedDeclaration = license?.declaration;
  let declaration: RestClientLicenseManifest["declaration"] = null;
  if (untypedDeclaration !== null) {
    const declarationRecord = asObject(untypedDeclaration);
    const name = asString(declarationRecord?.name);
    const url = asString(declarationRecord?.url);
    if (name === undefined || !/\bMIT\b/i.test(name) || !isWebUrl(url)) {
      throw new Error(`Invalid embedded license declaration for ${provider} ${version}`);
    }
    declaration = { name, url };
  }
  if (!Array.isArray(license?.notices)) {
    throw new Error(`Invalid notice manifest for ${provider} ${version}`);
  }
  const notices = license.notices.map((notice, index) =>
    parseLicensedSourceArtifact(notice, `${provider} ${version} notice ${index + 1}`, prefix)
  );
  return { spdx, attribution, declaration, text, notices };
}

function parseLicensedSourceArtifact(
  value: unknown,
  label: string,
  destinationPrefix: string,
): LicensedSourceArtifact {
  const artifact = asObject(value);
  const source = asString(artifact?.source);
  const destination = asString(artifact?.destination);
  const bytes = artifact?.bytes;
  const sha256 = asString(artifact?.sha256);
  if (
    !isHttpsUrl(source) || destination === undefined ||
    !destination.startsWith(destinationPrefix) ||
    !Number.isSafeInteger(bytes) || (bytes as number) < 0 || !isSha256(sha256)
  ) {
    throw new Error(`Invalid ${label} provenance`);
  }
  return { source, destination, bytes: bytes as number, sha256 };
}

function isHttpsUrl(value: string | undefined): value is string {
  if (value === undefined) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function isWebUrl(value: string | undefined): value is string {
  if (value === undefined) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function isSha256(value: string | undefined): value is string {
  return value !== undefined && /^sha256:[a-f0-9]{64}$/.test(value);
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
