import { parse as parseYaml } from "@std/yaml";

import {
  type ApiSpecFormat,
  type ApiSpecProvider,
  apiSpecProviders,
  type ApiSpecVersionSource,
  getApiSpecProviders,
  getApiSpecVersions,
  getVersionedRawApiSpecFileName,
} from "./sources.ts";
import { providerClientArtifact, providerTestArtifacts } from "../provider-layout.ts";

type FetchedApiSpec = {
  provider: ApiSpecProvider;
  version: string;
  format: ApiSpecFormat;
  source: ApiSpecVersionSource;
  body: string;
  bytes: number;
  sha256: string;
};

/** Source and test paths are repository-relative; clients are package-relative and docs are site-relative. */
export type RawSpecManifest = {
  schemaVersion: 1;
  providers: Record<
    string,
    {
      name: string;
      kind: "release" | "live";
      upstream: string;
      selected: string;
      client: typeof apiSpecProviders[ApiSpecProvider]["client"];
      testing?: { manifest: string };
      versions: Record<
        string,
        {
          containerImage: string | null;
          ref: string | null;
          source: string;
          format: ApiSpecFormat;
          destination: string;
          bytes: number;
          sha256: string;
          artifacts: {
            normalized: string;
            client: string;
            tests: string;
            results: string;
            compose: string;
            documentation: { openapi: string; operations: string; route: string };
          };
        }
      >;
    }
  >;
};

const rawSpecsDirectory = new URL("./raw/", import.meta.url);
const textEncoder = new TextEncoder();

export function applyApiSpecTransform(
  body: string,
  source: ApiSpecVersionSource,
  version: string,
): string {
  if (source.transform !== "gitea-template") return body;

  const transformed = body
    .replaceAll("{{.SwaggerAppVer}}", version)
    .replaceAll("{{.SwaggerAppSubUrl}}", "");
  if (/{{[^}]+}}/.test(transformed)) {
    throw new Error(`API specification ${version} contains unresolved template expressions`);
  }
  return transformed;
}

export function assertApiSpecDocument(
  body: string,
  format: ApiSpecFormat,
  description: string,
): void {
  let document: unknown;
  try {
    document = format === "yaml" ? parseYaml(body) : JSON.parse(body);
  } catch (error) {
    throw new Error(`${description} is not valid ${format.toUpperCase()}`, { cause: error });
  }

  if (document === null || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`${description} is not an API specification object`);
  }

  const record = document as Record<string, unknown>;
  if (typeof record.openapi !== "string" && typeof record.swagger !== "string") {
    throw new Error(`${description} has no openapi or swagger version`);
  }
}

export async function sha256(body: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(body));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

async function fetchApiSpec(
  provider: ApiSpecProvider,
  version: string,
  fetcher: typeof fetch,
): Promise<FetchedApiSpec> {
  const providerSource = apiSpecProviders[provider];
  const source = providerSource.versions[version];
  const response = await fetcher(source.url);
  if (!response.ok) {
    throw new Error(
      `${providerSource.name} ${version} request failed: ${response.status} ${response.statusText}`,
    );
  }

  const body = applyApiSpecTransform(await response.text(), source, version);
  return describeApiSpec(provider, version, body);
}

async function describeApiSpec(
  provider: ApiSpecProvider,
  version: string,
  body: string,
): Promise<FetchedApiSpec> {
  const providerSource = apiSpecProviders[provider];
  assertApiSpecDocument(body, providerSource.format, `${providerSource.name} ${version}`);
  return {
    provider,
    version,
    format: providerSource.format,
    source: providerSource.versions[version],
    body,
    bytes: textEncoder.encode(body).byteLength,
    sha256: await sha256(body),
  };
}

function createRawSpecManifest(fetchedSpecs: FetchedApiSpec[]): RawSpecManifest {
  const manifest: RawSpecManifest = { schemaVersion: 1, providers: {} };
  for (const provider of getApiSpecProviders()) {
    const providerSource = apiSpecProviders[provider];
    const versions: RawSpecManifest["providers"][string]["versions"] = {};
    for (const version of getApiSpecVersions(provider)) {
      const fetched = fetchedSpecs.find((item) =>
        item.provider === provider && item.version === version
      );
      if (fetched === undefined) {
        throw new Error(`Missing fetched API specification ${provider} ${version}`);
      }
      versions[version] = {
        containerImage: fetched.source.containerImage ?? null,
        ref: fetched.source.ref ?? null,
        source: fetched.source.url,
        format: fetched.format,
        destination: `codegen/pangit/specs/raw/${
          getVersionedRawApiSpecFileName(provider, version)
        }`,
        bytes: fetched.bytes,
        sha256: fetched.sha256,
        artifacts: {
          normalized: `codegen/pangit/specs/normalized/${provider}/${version}.json`,
          client: providerClientArtifact(provider, version),
          ...providerTestArtifacts(provider, version),
          documentation: {
            openapi: `app/documentation/generated/${provider}/${version}/openapi.json`,
            operations: `app/documentation/generated/${provider}/${version}/operations.json`,
            route: `/docs/raw/${provider}/${version}`,
          },
        },
      };
    }
    manifest.providers[provider] = {
      name: providerSource.name,
      kind: providerSource.kind,
      upstream: providerSource.upstream,
      selected: providerSource.selected,
      client: providerSource.client,
      ...(providerSource.testing ? { testing: providerSource.testing } : {}),
      versions,
    };
  }
  return manifest;
}

export async function fetchApiSpecs(
  fetcher: typeof fetch = fetch,
  directory = rawSpecsDirectory,
): Promise<void> {
  const requests = getApiSpecProviders().flatMap((provider) =>
    getApiSpecVersions(provider).map((version) => fetchApiSpec(provider, version, fetcher))
  );

  // Validate every response before replacing any local raw specification.
  const fetchedSpecs = await Promise.all(requests);
  try {
    await Deno.remove(directory, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  await Deno.mkdir(directory, { recursive: true });

  for (const fetched of fetchedSpecs) {
    const fileName = getVersionedRawApiSpecFileName(fetched.provider, fetched.version);
    await Deno.mkdir(new URL(`${fetched.provider}/`, directory), { recursive: true });
    await Deno.writeTextFile(new URL(fileName, directory), fetched.body);
  }

  const manifest = createRawSpecManifest(fetchedSpecs);
  await Deno.writeTextFile(
    new URL("manifest.json", directory),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

/** Rebuild the source manifest from validated checked-in specs, without fetching upstream. */
export async function reuseApiSpecs(directory = rawSpecsDirectory): Promise<void> {
  const specs: FetchedApiSpec[] = [];
  for (const provider of getApiSpecProviders()) {
    for (const version of getApiSpecVersions(provider)) {
      const body = await Deno.readTextFile(
        new URL(getVersionedRawApiSpecFileName(provider, version), directory),
      );
      specs.push(await describeApiSpec(provider, version, body));
    }
  }
  await Deno.writeTextFile(
    new URL("manifest.json", directory),
    `${JSON.stringify(createRawSpecManifest(specs), null, 2)}\n`,
  );
}
