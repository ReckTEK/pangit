import configuredGitHosts from "./git-hosts.json" with { type: "json" };

export type OpenApiFormat = "json" | "yaml";
export type OpenApiSourceKind = "release" | "live";
export type OpenApiTransform = "gitea-template";

export type OpenApiNoticeSource = {
  url: string;
  expectedSha256: string;
};

export type OpenApiLicenseSource = {
  spdx: "MIT";
  url: string;
  expectedSha256: string;
  attribution: string;
  declaration?: {
    name: string;
    url: string;
  };
  notices?: OpenApiNoticeSource[];
};

export type OpenApiVersionSource = {
  url: string;
  expectedSha256: string;
  ref?: string;
  transform?: OpenApiTransform;
  license?: OpenApiLicenseSource;
};

export type GitHostOpenApiSource = {
  name: string;
  kind: OpenApiSourceKind;
  format: OpenApiFormat;
  selected: string;
  upstream: string;
  client: {
    className: string;
    displayName: string;
    namespaceName: string;
    variablePrefix: string;
  };
  versions: Record<string, OpenApiVersionSource>;
};

export type GitHost = keyof typeof configuredGitHosts;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertHttpsUrl(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`${field} must use HTTPS`);
}

function assertWebUrl(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string") throw new Error(`${field} must be a string`);
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${field} must use HTTP or HTTPS`);
  }
}

function assertSha256(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error(`${field} must be a SHA-256 digest`);
  }
}

function validateGitHostMap(
  value: unknown,
): asserts value is Record<GitHost, GitHostOpenApiSource> {
  if (!isRecord(value)) throw new Error("OpenAPI Git-host map must be an object");

  for (const [gitHost, untypedSource] of Object.entries(value)) {
    if (!/^[a-z0-9-]+$/.test(gitHost) || !isRecord(untypedSource)) {
      throw new Error(`Invalid OpenAPI Git host ${gitHost}`);
    }

    const source = untypedSource as Record<string, unknown>;
    if (typeof source.name !== "string" || source.name.length === 0) {
      throw new Error(`${gitHost}.name must be a non-empty string`);
    }
    if (source.kind !== "release" && source.kind !== "live") {
      throw new Error(`${gitHost}.kind must be release or live`);
    }
    if (source.format !== "json" && source.format !== "yaml") {
      throw new Error(`${gitHost}.format must be json or yaml`);
    }
    if (typeof source.selected !== "string" || source.selected.length === 0) {
      throw new Error(`${gitHost}.selected must be a non-empty string`);
    }
    assertHttpsUrl(source.upstream, `${gitHost}.upstream`);
    if (!isRecord(source.client)) throw new Error(`${gitHost}.client must be an object`);
    for (const field of ["className", "displayName", "namespaceName", "variablePrefix"]) {
      if (typeof source.client[field] !== "string" || source.client[field].length === 0) {
        throw new Error(`${gitHost}.client.${field} must be a non-empty string`);
      }
    }
    if (!isRecord(source.versions) || Object.keys(source.versions).length === 0) {
      throw new Error(`${gitHost}.versions must be a non-empty object`);
    }
    if (!(source.selected in source.versions)) {
      throw new Error(`${gitHost}.selected is not present in versions`);
    }

    const versions = Object.entries(source.versions);
    if (source.kind === "live" && (versions.length !== 1 || versions[0][0] !== "latest")) {
      throw new Error(`${gitHost} live source must contain only latest`);
    }

    for (const [version, untypedVersionSource] of versions) {
      if (!isRecord(untypedVersionSource)) {
        throw new Error(`${gitHost}.versions.${version} must be an object`);
      }
      const versionSource = untypedVersionSource as Record<string, unknown>;
      assertHttpsUrl(versionSource.url, `${gitHost}.versions.${version}.url`);
      assertSha256(
        versionSource.expectedSha256,
        `${gitHost}.versions.${version}.expectedSha256`,
      );
      if (versionSource.license !== undefined) {
        if (!isRecord(versionSource.license)) {
          throw new Error(`${gitHost}.versions.${version}.license must be an object`);
        }
        if (versionSource.license.spdx !== "MIT") {
          throw new Error(`${gitHost}.versions.${version}.license.spdx must be MIT`);
        }
        assertHttpsUrl(
          versionSource.license.url,
          `${gitHost}.versions.${version}.license.url`,
        );
        assertSha256(
          versionSource.license.expectedSha256,
          `${gitHost}.versions.${version}.license.expectedSha256`,
        );
        if (
          typeof versionSource.license.attribution !== "string" ||
          versionSource.license.attribution.trim().length === 0
        ) {
          throw new Error(
            `${gitHost}.versions.${version}.license.attribution must be a non-empty string`,
          );
        }
        if (versionSource.license.notices !== undefined) {
          if (!Array.isArray(versionSource.license.notices)) {
            throw new Error(`${gitHost}.versions.${version}.license.notices must be an array`);
          }
          const noticeUrls = new Set<string>();
          for (const [index, notice] of versionSource.license.notices.entries()) {
            if (!isRecord(notice)) {
              throw new Error(
                `${gitHost}.versions.${version}.license.notices[${index}] must be an object`,
              );
            }
            assertHttpsUrl(
              notice.url,
              `${gitHost}.versions.${version}.license.notices[${index}].url`,
            );
            assertSha256(
              notice.expectedSha256,
              `${gitHost}.versions.${version}.license.notices[${index}].expectedSha256`,
            );
            if (noticeUrls.has(notice.url)) {
              throw new Error(
                `${gitHost}.versions.${version}.license.notices contains duplicate ${notice.url}`,
              );
            }
            noticeUrls.add(notice.url as string);
          }
        }
        if (versionSource.license.declaration !== undefined) {
          if (!isRecord(versionSource.license.declaration)) {
            throw new Error(`${gitHost}.versions.${version}.license.declaration must be an object`);
          }
          if (
            typeof versionSource.license.declaration.name !== "string" ||
            !/\bMIT\b/i.test(versionSource.license.declaration.name)
          ) {
            throw new Error(
              `${gitHost}.versions.${version}.license.declaration.name must identify MIT`,
            );
          }
          assertWebUrl(
            versionSource.license.declaration.url,
            `${gitHost}.versions.${version}.license.declaration.url`,
          );
        }
      }

      if (source.kind === "release") {
        if (!/^\d+\.\d+\.\d+$/.test(version)) {
          throw new Error(`${gitHost} release version ${version} is not stable semver`);
        }
        if (
          typeof versionSource.ref !== "string" ||
          !/^v\d+\.\d+\.\d+(?:-ee)?$/.test(versionSource.ref)
        ) {
          throw new Error(`${gitHost} release version ${version} has invalid ref`);
        }
        if (!versionSource.url.includes(`/${versionSource.ref}/`)) {
          throw new Error(`${gitHost} release URL is not pinned to ${versionSource.ref}`);
        }
        if (
          isRecord(versionSource.license) &&
          !(versionSource.license.url as string).includes(`/${versionSource.ref}/`)
        ) {
          throw new Error(
            `${gitHost} release license URL is not pinned to ${versionSource.ref}`,
          );
        }
      } else if (versionSource.ref !== undefined) {
        throw new Error(`${gitHost} live source must not declare a ref`);
      }

      if (versionSource.transform !== undefined && versionSource.transform !== "gitea-template") {
        throw new Error(`${gitHost} version ${version} has unsupported transform`);
      }
    }
  }
}

validateGitHostMap(configuredGitHosts);

/** Hand-written Git-host catalog used only to download and generate raw REST clients. */
export const gitHostOpenApiSources: Record<GitHost, GitHostOpenApiSource> = configuredGitHosts;

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  if (leftParts.every(Number.isFinite) && rightParts.every(Number.isFinite)) {
    for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index++) {
      const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
      if (difference !== 0) return difference;
    }
    return 0;
  }
  return left.localeCompare(right);
}

export function getGitHosts(): GitHost[] {
  return Object.keys(gitHostOpenApiSources).sort() as GitHost[];
}

export function getGitHostApiVersions(gitHost: GitHost): string[] {
  return Object.keys(gitHostOpenApiSources[gitHost].versions).sort(compareVersions);
}

export function getDownloadedOpenApiFileName(gitHost: GitHost, version: string): string {
  if (!(version in gitHostOpenApiSources[gitHost].versions)) {
    throw new Error(`Unknown ${gitHost} OpenAPI version ${version}`);
  }
  return `${gitHost}/${version}.${gitHostOpenApiSources[gitHost].format}`;
}
