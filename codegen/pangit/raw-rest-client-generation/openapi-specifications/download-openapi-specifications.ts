import { parse as parseYaml } from "@std/yaml";

import { generatedRestClientArtifact } from "../generated-rest-client-paths.ts";
import {
  getDownloadedOpenApiFileName,
  getGitHostApiVersions,
  getGitHosts,
  type GitHost,
  gitHostOpenApiSources,
  type OpenApiFormat,
  type OpenApiVersionSource,
} from "./openapi-source-catalog.ts";

type DownloadedOpenApiSpecification = {
  gitHost: GitHost;
  version: string;
  format: OpenApiFormat;
  source: OpenApiVersionSource;
  body: string;
  bytes: number;
  sha256: string;
};

/** Generated inventory consumed by REST-client generation and site documentation generation. */
export type GeneratedOpenApiManifest = {
  schemaVersion: 1;
  gitHosts: Record<
    string,
    {
      name: string;
      kind: "release" | "live";
      upstream: string;
      selected: string;
      client: typeof gitHostOpenApiSources[GitHost]["client"];
      versions: Record<
        string,
        {
          ref: string | null;
          source: string;
          format: OpenApiFormat;
          destination: string;
          bytes: number;
          sha256: string;
          artifacts: {
            normalized: string;
            client: string;
            documentation: { openapi: string; operations: string; route: string };
          };
        }
      >;
    }
  >;
};

const downloadedSpecificationsDirectory = new URL("./downloaded/", import.meta.url);
const textEncoder = new TextEncoder();

export function applyOpenApiTransform(
  body: string,
  source: OpenApiVersionSource,
  version: string,
): string {
  if (source.transform !== "gitea-template") return body;
  const transformed = body
    .replaceAll("{{.SwaggerAppVer}}", version)
    .replaceAll("{{.SwaggerAppSubUrl}}", "");
  if (/{{[^}]+}}/.test(transformed)) {
    throw new Error(`OpenAPI specification ${version} contains unresolved template expressions`);
  }
  return transformed;
}

export function assertOpenApiDocument(
  body: string,
  format: OpenApiFormat,
  description: string,
): void {
  let document: unknown;
  try {
    document = format === "yaml" ? parseYaml(body) : JSON.parse(body);
  } catch (error) {
    throw new Error(`${description} is not valid ${format.toUpperCase()}`, { cause: error });
  }
  if (document === null || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`${description} is not an OpenAPI specification object`);
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

async function downloadOpenApiSpecification(
  gitHost: GitHost,
  version: string,
  fetcher: typeof fetch,
): Promise<DownloadedOpenApiSpecification> {
  const hostSource = gitHostOpenApiSources[gitHost];
  const source = hostSource.versions[version];
  const response = await fetcher(source.url);
  if (!response.ok) {
    throw new Error(
      `${hostSource.name} ${version} request failed: ${response.status} ${response.statusText}`,
    );
  }
  const body = applyOpenApiTransform(await response.text(), source, version);
  return describeOpenApiSpecification(gitHost, version, body);
}

async function describeOpenApiSpecification(
  gitHost: GitHost,
  version: string,
  body: string,
): Promise<DownloadedOpenApiSpecification> {
  const hostSource = gitHostOpenApiSources[gitHost];
  assertOpenApiDocument(body, hostSource.format, `${hostSource.name} ${version}`);
  return {
    gitHost,
    version,
    format: hostSource.format,
    source: hostSource.versions[version],
    body,
    bytes: textEncoder.encode(body).byteLength,
    sha256: await sha256(body),
  };
}

function createGeneratedOpenApiManifest(
  downloaded: DownloadedOpenApiSpecification[],
): GeneratedOpenApiManifest {
  const manifest: GeneratedOpenApiManifest = { schemaVersion: 1, gitHosts: {} };
  for (const gitHost of getGitHosts()) {
    const hostSource = gitHostOpenApiSources[gitHost];
    const versions: GeneratedOpenApiManifest["gitHosts"][string]["versions"] = {};
    for (const version of getGitHostApiVersions(gitHost)) {
      const specification = downloaded.find((item) =>
        item.gitHost === gitHost && item.version === version
      );
      if (specification === undefined) {
        throw new Error(`Missing downloaded OpenAPI specification ${gitHost} ${version}`);
      }
      versions[version] = {
        ref: specification.source.ref ?? null,
        source: specification.source.url,
        format: specification.format,
        destination: `codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/${
          getDownloadedOpenApiFileName(gitHost, version)
        }`,
        bytes: specification.bytes,
        sha256: specification.sha256,
        artifacts: {
          normalized:
            `codegen/pangit/raw-rest-client-generation/openapi-specifications/normalized/${gitHost}/${version}.json`,
          client: generatedRestClientArtifact(gitHost, version),
          documentation: {
            openapi: `app/documentation/generated/${gitHost}/${version}/openapi.json`,
            operations: `app/documentation/generated/${gitHost}/${version}/operations.json`,
            route: `/docs/raw/${gitHost}/${version}`,
          },
        },
      };
    }
    manifest.gitHosts[gitHost] = {
      name: hostSource.name,
      kind: hostSource.kind,
      upstream: hostSource.upstream,
      selected: hostSource.selected,
      client: hostSource.client,
      versions,
    };
  }
  return manifest;
}

export async function downloadOpenApiSpecifications(
  fetcher: typeof fetch = fetch,
  directory = downloadedSpecificationsDirectory,
): Promise<void> {
  const requests = getGitHosts().flatMap((gitHost) =>
    getGitHostApiVersions(gitHost).map((version) =>
      downloadOpenApiSpecification(gitHost, version, fetcher)
    )
  );
  const downloaded = await Promise.all(requests);
  try {
    await Deno.remove(directory, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  await Deno.mkdir(directory, { recursive: true });
  for (const specification of downloaded) {
    const fileName = getDownloadedOpenApiFileName(specification.gitHost, specification.version);
    await Deno.mkdir(new URL(`${specification.gitHost}/`, directory), { recursive: true });
    await Deno.writeTextFile(new URL(fileName, directory), specification.body);
  }
  await Deno.writeTextFile(
    new URL("generated-manifest.json", directory),
    `${JSON.stringify(createGeneratedOpenApiManifest(downloaded), null, 2)}\n`,
  );
}

/** Rebuild the generated manifest from checked-in OpenAPI files without downloading. */
export async function reuseDownloadedOpenApiSpecifications(
  directory = downloadedSpecificationsDirectory,
): Promise<void> {
  const specifications: DownloadedOpenApiSpecification[] = [];
  for (const gitHost of getGitHosts()) {
    for (const version of getGitHostApiVersions(gitHost)) {
      const body = await Deno.readTextFile(
        new URL(getDownloadedOpenApiFileName(gitHost, version), directory),
      );
      specifications.push(await describeOpenApiSpecification(gitHost, version, body));
    }
  }
  await Deno.writeTextFile(
    new URL("generated-manifest.json", directory),
    `${JSON.stringify(createGeneratedOpenApiManifest(specifications), null, 2)}\n`,
  );
}
