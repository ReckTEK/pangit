import configuredProviders from "./providers.json" with { type: "json" };

export type ApiSpecFormat = "json" | "yaml";
export type ApiSpecSourceKind = "release" | "live";
export type ApiSpecTransform = "gitea-template";

export type ApiSpecVersionSource = {
  containerImage?: string;
  url: string;
  ref?: string;
  transform?: ApiSpecTransform;
};

export type ApiSpecProviderSource = {
  name: string;
  kind: ApiSpecSourceKind;
  format: ApiSpecFormat;
  selected: string;
  upstream: string;
  versions: Record<string, ApiSpecVersionSource>;
};

export type ApiSpecSource = ApiSpecVersionSource & {
  name: string;
  format: ApiSpecFormat;
};

export type ApiSpecProvider = keyof typeof configuredProviders;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertHttpsUrl(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string`);
  }

  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error(`${field} must use HTTPS`);
  }
}

function validateProviderMap(
  value: unknown,
): asserts value is Record<ApiSpecProvider, ApiSpecProviderSource> {
  if (!isRecord(value)) {
    throw new Error("API specification provider map must be an object");
  }

  for (const [provider, untypedSource] of Object.entries(value)) {
    if (!/^[a-z0-9-]+$/.test(provider) || !isRecord(untypedSource)) {
      throw new Error(`Invalid API specification provider ${provider}`);
    }

    const source = untypedSource as Record<string, unknown>;
    if (typeof source.name !== "string" || source.name.length === 0) {
      throw new Error(`${provider}.name must be a non-empty string`);
    }
    if (source.kind !== "release" && source.kind !== "live") {
      throw new Error(`${provider}.kind must be release or live`);
    }
    if (source.format !== "json" && source.format !== "yaml") {
      throw new Error(`${provider}.format must be json or yaml`);
    }
    if (typeof source.selected !== "string" || source.selected.length === 0) {
      throw new Error(`${provider}.selected must be a non-empty string`);
    }
    assertHttpsUrl(source.upstream, `${provider}.upstream`);
    if (!isRecord(source.versions) || Object.keys(source.versions).length === 0) {
      throw new Error(`${provider}.versions must be a non-empty object`);
    }
    if (!(source.selected in source.versions)) {
      throw new Error(`${provider}.selected is not present in versions`);
    }

    const versions = Object.entries(source.versions);
    if (source.kind === "live" && (versions.length !== 1 || versions[0][0] !== "latest")) {
      throw new Error(`${provider} live source must contain only latest`);
    }

    for (const [version, untypedVersionSource] of versions) {
      if (!isRecord(untypedVersionSource)) {
        throw new Error(`${provider}.versions.${version} must be an object`);
      }
      const versionSource = untypedVersionSource as Record<string, unknown>;
      assertHttpsUrl(versionSource.url, `${provider}.versions.${version}.url`);

      if (versionSource.containerImage !== undefined) {
        if (typeof versionSource.containerImage !== "string") {
          throw new Error(`${provider} version ${version} has invalid container image`);
        }
        const taggedImage = versionSource.containerImage.split("@", 1)[0];
        if (!taggedImage.endsWith(`:${version}`)) {
          throw new Error(`${provider} container image does not match version ${version}`);
        }
      }

      if (source.kind === "release") {
        if (!/^\d+\.\d+\.\d+$/.test(version)) {
          throw new Error(`${provider} release version ${version} is not stable semver`);
        }
        if (
          typeof versionSource.ref !== "string" ||
          !/^v\d+\.\d+\.\d+(?:-ee)?$/.test(versionSource.ref)
        ) {
          throw new Error(`${provider} release version ${version} has invalid ref`);
        }
        if (!versionSource.url.includes(`/${versionSource.ref}/`)) {
          throw new Error(`${provider} release URL is not pinned to ${versionSource.ref}`);
        }
      } else if (versionSource.ref !== undefined) {
        throw new Error(`${provider} live source must not declare a ref`);
      }

      if (
        versionSource.transform !== undefined &&
        versionSource.transform !== "gitea-template"
      ) {
        throw new Error(`${provider} version ${version} has unsupported transform`);
      }
    }

    if (
      provider === "gitea" &&
      versions.some(([, versionSource]) =>
        !isRecord(versionSource) || typeof versionSource.containerImage !== "string"
      )
    ) {
      throw new Error("Every Gitea release must declare its matching container image");
    }
  }
}

validateProviderMap(configuredProviders);

/** Authoritative provider, version, source, and selection map. */
export const apiSpecProviders = configuredProviders;

/** Selected sources retained for existing normalization and generation code. */
export const apiSpecSources = Object.fromEntries(
  Object.entries(apiSpecProviders).map(([provider, source]) => [
    provider,
    {
      name: source.name,
      format: source.format,
      ...source.versions[source.selected],
    },
  ]),
) as Record<ApiSpecProvider, ApiSpecSource>;

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

export function getApiSpecProviders(): ApiSpecProvider[] {
  return Object.keys(apiSpecProviders).sort() as ApiSpecProvider[];
}

export function getApiSpecVersions(provider: ApiSpecProvider): string[] {
  return Object.keys(apiSpecProviders[provider].versions).sort(compareVersions);
}

export function getSelectedApiSpecVersion(provider: ApiSpecProvider): string {
  return apiSpecProviders[provider].selected;
}

export function getRawApiSpecFileName(provider: ApiSpecProvider): string {
  return `${provider}.${apiSpecProviders[provider].format}`;
}

export function getVersionedRawApiSpecFileName(
  provider: ApiSpecProvider,
  version: string,
): string {
  if (!(version in apiSpecProviders[provider].versions)) {
    throw new Error(`Unknown ${provider} API specification version ${version}`);
  }
  return `${provider}/${version}.${apiSpecProviders[provider].format}`;
}
