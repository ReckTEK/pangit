import { parse as parseYaml } from "@std/yaml";

import { generatedRestClientArtifact } from "../generated-rest-client-paths.ts";
import {
  getDownloadedOpenApiFileName,
  getGitHostApiVersions,
  getGitHosts,
  type GitHost,
  gitHostOpenApiSources,
  type OpenApiFormat,
  type OpenApiLicenseSource,
  type OpenApiVersionSource,
} from "./openapi-source-catalog.ts";

type DownloadedTextArtifact = {
  source: string;
  body: string;
  bytes: number;
  sha256: string;
};

type DownloadedOpenApiSpecification = {
  gitHost: GitHost;
  version: string;
  format: OpenApiFormat;
  source: OpenApiVersionSource;
  body: string;
  bytes: number;
  sha256: string;
  license: {
    source: OpenApiLicenseSource;
    text: DownloadedTextArtifact;
    notices: DownloadedTextArtifact[];
  } | null;
};

type GeneratedTextArtifact = {
  source: string;
  destination: string;
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
          license: {
            spdx: "MIT";
            attribution: string;
            declaration: { name: string; url: string } | null;
            text: GeneratedTextArtifact;
            notices: GeneratedTextArtifact[];
          } | null;
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
const downloadedDestination =
  "codegen/pangit/raw-rest-client-generation/openapi-specifications/downloaded/";
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

export function assertOpenApiLicenseDeclaration(
  body: string,
  format: OpenApiFormat,
  expected: { name: string; url: string },
  description: string,
): void {
  const document = format === "yaml" ? parseYaml(body) : JSON.parse(body);
  if (document === null || typeof document !== "object" || Array.isArray(document)) {
    throw new Error(`${description} is not an OpenAPI specification object`);
  }
  const info = (document as Record<string, unknown>).info;
  const license = info !== null && typeof info === "object" && !Array.isArray(info)
    ? (info as Record<string, unknown>).license
    : undefined;
  if (license === null || typeof license !== "object" || Array.isArray(license)) {
    throw new Error(`${description} does not contain its required MIT license declaration`);
  }
  const actual = license as Record<string, unknown>;
  if (actual.name !== expected.name || actual.url !== expected.url) {
    throw new Error(`${description} MIT license declaration does not match the reviewed source`);
  }
}

export function assertMitLicenseText(body: string, description: string): void {
  const normalized = body.toLowerCase();
  if (
    !normalized.includes("permission is hereby granted") ||
    !normalized.includes('the software is provided "as is"')
  ) {
    throw new Error(`${description} is not recognizable MIT license text`);
  }
}

function assertNoticeText(body: string, description: string): void {
  if (body.trim().length === 0) throw new Error(`${description} is empty`);
}

export async function sha256(body: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(body));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

function getDownloadedLicenseFileName(gitHost: GitHost, version: string): string {
  return `licenses/${gitHost}/${version}/LICENSE.txt`;
}

function getDownloadedNoticeFileName(
  gitHost: GitHost,
  version: string,
  index: number,
): string {
  return `licenses/${gitHost}/${version}/NOTICE-${String(index + 1).padStart(2, "0")}.txt`;
}

async function describeTextArtifact(source: string, body: string): Promise<DownloadedTextArtifact> {
  return {
    source,
    body,
    bytes: textEncoder.encode(body).byteLength,
    sha256: await sha256(body),
  };
}

async function fetchText(
  url: string,
  description: string,
  fetcher: typeof fetch,
): Promise<string> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`${description} request failed: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

async function describeOpenApiSpecification(
  gitHost: GitHost,
  version: string,
  body: string,
  licenseBody: string | null,
  noticeBodies: string[],
): Promise<DownloadedOpenApiSpecification> {
  const hostSource = gitHostOpenApiSources[gitHost];
  const source = hostSource.versions[version];
  assertOpenApiDocument(body, hostSource.format, `${hostSource.name} ${version}`);
  if (source.license?.declaration !== undefined) {
    assertOpenApiLicenseDeclaration(
      body,
      hostSource.format,
      source.license.declaration,
      `${hostSource.name} ${version}`,
    );
  }
  const specificationSha256 = await sha256(body);
  if (specificationSha256 !== source.expectedSha256) {
    throw new Error(
      `${hostSource.name} ${version} specification hash changed: ${specificationSha256} != ${source.expectedSha256}`,
    );
  }
  const licenseSource = source.license;
  if (licenseSource === undefined) {
    if (licenseBody !== null || noticeBodies.length !== 0) {
      throw new Error(`${hostSource.name} ${version} has unexpected license artifacts`);
    }
    return {
      gitHost,
      version,
      format: hostSource.format,
      source,
      body,
      bytes: textEncoder.encode(body).byteLength,
      sha256: specificationSha256,
      license: null,
    };
  }
  if (licenseBody === null) {
    throw new Error(`${hostSource.name} ${version} is missing configured license text`);
  }
  assertMitLicenseText(licenseBody, `${hostSource.name} ${version} license`);
  if (noticeBodies.length !== (licenseSource.notices?.length ?? 0)) {
    throw new Error(`${hostSource.name} ${version} has incomplete third-party notices`);
  }
  for (const [index, noticeBody] of noticeBodies.entries()) {
    assertNoticeText(noticeBody, `${hostSource.name} ${version} notice ${index + 1}`);
  }
  const licenseText = await describeTextArtifact(licenseSource.url, licenseBody);
  if (licenseText.sha256 !== licenseSource.expectedSha256) {
    throw new Error(
      `${hostSource.name} ${version} license hash changed: ${licenseText.sha256} != ${licenseSource.expectedSha256}`,
    );
  }
  const notices = await Promise.all(
    noticeBodies.map((noticeBody, index) =>
      describeTextArtifact(licenseSource.notices![index].url, noticeBody)
    ),
  );
  for (const [index, notice] of notices.entries()) {
    const expected = licenseSource.notices![index].expectedSha256;
    if (notice.sha256 !== expected) {
      throw new Error(
        `${hostSource.name} ${version} notice ${
          index + 1
        } hash changed: ${notice.sha256} != ${expected}`,
      );
    }
  }
  return {
    gitHost,
    version,
    format: hostSource.format,
    source,
    body,
    bytes: textEncoder.encode(body).byteLength,
    sha256: specificationSha256,
    license: {
      source: licenseSource,
      text: licenseText,
      notices,
    },
  };
}

async function downloadOpenApiSpecification(
  gitHost: GitHost,
  version: string,
  fetcher: typeof fetch,
): Promise<DownloadedOpenApiSpecification> {
  const hostSource = gitHostOpenApiSources[gitHost];
  const source = hostSource.versions[version];
  const rawBody = await fetchText(source.url, `${hostSource.name} ${version}`, fetcher);
  let licenseBody: string | null = null;
  let noticeBodies: string[] = [];
  if (source.license !== undefined) {
    [licenseBody, noticeBodies] = await Promise.all([
      fetchText(source.license.url, `${hostSource.name} ${version} license`, fetcher),
      Promise.all(
        (source.license.notices ?? []).map((notice, index) =>
          fetchText(notice.url, `${hostSource.name} ${version} notice ${index + 1}`, fetcher)
        ),
      ),
    ]);
  }
  return await describeOpenApiSpecification(
    gitHost,
    version,
    applyOpenApiTransform(rawBody, source, version),
    licenseBody,
    noticeBodies,
  );
}

function generatedTextArtifact(
  artifact: DownloadedTextArtifact,
  destination: string,
): GeneratedTextArtifact {
  return {
    source: artifact.source,
    destination: `${downloadedDestination}${destination}`,
    bytes: artifact.bytes,
    sha256: artifact.sha256,
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
        destination: `${downloadedDestination}${getDownloadedOpenApiFileName(gitHost, version)}`,
        bytes: specification.bytes,
        sha256: specification.sha256,
        license: specification.license === null ? null : {
          spdx: specification.license.source.spdx,
          attribution: specification.license.source.attribution,
          declaration: specification.license.source.declaration ?? null,
          text: generatedTextArtifact(
            specification.license.text,
            getDownloadedLicenseFileName(gitHost, version),
          ),
          notices: specification.license.notices.map((notice, index) =>
            generatedTextArtifact(
              notice,
              getDownloadedNoticeFileName(gitHost, version, index),
            )
          ),
        },
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

async function writeTextArtifact(directory: URL, fileName: string, body: string): Promise<void> {
  const destination = new URL(fileName, directory);
  await Deno.mkdir(new URL("./", destination), { recursive: true });
  await Deno.writeTextFile(destination, body);
}

async function writeDownloadedSnapshot(
  downloaded: DownloadedOpenApiSpecification[],
  directory: URL,
): Promise<void> {
  await Deno.mkdir(directory, { recursive: true });
  for (const specification of downloaded) {
    await writeTextArtifact(
      directory,
      getDownloadedOpenApiFileName(specification.gitHost, specification.version),
      specification.body,
    );
    if (specification.license !== null) {
      await writeTextArtifact(
        directory,
        getDownloadedLicenseFileName(specification.gitHost, specification.version),
        specification.license.text.body,
      );
      for (const [index, notice] of specification.license.notices.entries()) {
        await writeTextArtifact(
          directory,
          getDownloadedNoticeFileName(specification.gitHost, specification.version, index),
          notice.body,
        );
      }
    }
  }
  await Deno.writeTextFile(
    new URL("generated-manifest.json", directory),
    `${JSON.stringify(createGeneratedOpenApiManifest(downloaded), null, 2)}\n`,
  );
}

async function removeIfPresent(path: URL): Promise<void> {
  try {
    await Deno.remove(path, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
}

async function replaceDownloadedDirectory(
  directory: URL,
  downloaded: DownloadedOpenApiSpecification[],
): Promise<void> {
  const target = directory.href.endsWith("/") ? directory : new URL(`${directory.href}/`);
  const parent = new URL("../", target);
  const identifier = crypto.randomUUID();
  const staging = new URL(`.openapi-download-stage-${identifier}/`, parent);
  const backup = new URL(`.openapi-download-backup-${identifier}/`, parent);
  let movedExistingTarget = false;
  await Deno.mkdir(parent, { recursive: true });
  try {
    await writeDownloadedSnapshot(downloaded, staging);
    try {
      await Deno.rename(target, backup);
      movedExistingTarget = true;
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
    try {
      await Deno.rename(staging, target);
    } catch (error) {
      if (movedExistingTarget) await Deno.rename(backup, target);
      throw error;
    }
    if (movedExistingTarget) await Deno.remove(backup, { recursive: true });
  } catch (error) {
    await removeIfPresent(staging);
    throw error;
  }
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
  await replaceDownloadedDirectory(directory, downloaded);
}

async function reuseDownloadedOpenApiSpecification(
  directory: URL,
  gitHost: GitHost,
  version: string,
): Promise<DownloadedOpenApiSpecification> {
  const source = gitHostOpenApiSources[gitHost].versions[version];
  const body = await Deno.readTextFile(
    new URL(getDownloadedOpenApiFileName(gitHost, version), directory),
  );
  let licenseBody: string | null = null;
  let noticeBodies: string[] = [];
  if (source.license !== undefined) {
    [licenseBody, noticeBodies] = await Promise.all([
      Deno.readTextFile(new URL(getDownloadedLicenseFileName(gitHost, version), directory)),
      Promise.all(
        (source.license.notices ?? []).map((_, index) =>
          Deno.readTextFile(
            new URL(getDownloadedNoticeFileName(gitHost, version, index), directory),
          )
        ),
      ),
    ]);
  }
  return await describeOpenApiSpecification(
    gitHost,
    version,
    body,
    licenseBody,
    noticeBodies,
  );
}

/** Rebuild the generated manifest and legal bundle from checked-in downloaded files. */
export async function reuseDownloadedOpenApiSpecifications(
  directory = downloadedSpecificationsDirectory,
): Promise<void> {
  const requests = getGitHosts().flatMap((gitHost) =>
    getGitHostApiVersions(gitHost).map((version) =>
      reuseDownloadedOpenApiSpecification(directory, gitHost, version)
    )
  );
  const downloaded = await Promise.all(requests);
  await replaceDownloadedDirectory(directory, downloaded);
}
