import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ListPackageFilesOptions,
  ListPackagesRequest,
  PackageCapabilitySupport,
  PackageCoordinates,
  PackageFileData,
  PackageVersionData,
  PackageVersionIdentity,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import { createPage, type Page } from "../../../fluent-api/adapter-contract/pagination.ts";
import type { ResolvedPageRequest } from "../../../fluent-api/adapter-contract/pagination.ts";
import { fluentClientCapabilitySupport } from "../../../fluent-api/provider-registry.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaPackageEntityNative,
  type GiteaPackageEntityPayload,
} from "../native/GiteaPackageNative.ts";
import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "../response.ts";

type AnyGiteaPackage = GiteaPackageEntityPayload<GiteaVersion, "package">;
type AnyGiteaPackageFile = GiteaPackageEntityPayload<GiteaVersion, "packageFile">;

const GITEA_PACKAGE_TYPES = Object.freeze(
  [
    "alpine",
    "cargo",
    "chef",
    "composer",
    "conan",
    "conda",
    "container",
    "cran",
    "debian",
    "generic",
    "go",
    "helm",
    "maven",
    "npm",
    "nuget",
    "pub",
    "pypi",
    "rpm",
    "rubygems",
    "swift",
    "terraform",
    "vagrant",
  ] as const,
);

type GiteaPackageType = (typeof GITEA_PACKAGE_TYPES)[number];

export const giteaPackageSupport: PackageCapabilitySupport =
  fluentClientCapabilitySupport.gitea["1.27.2"].packages;

/** Fetch exactly one provider page of package versions owned by one user or organization. */
export async function listGiteaPackages<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  owner: string,
  request: ListPackagesRequest,
): Promise<Page<PackageVersionData<"gitea", TVersion>>> {
  const operation = { universal: "listPackages", native: "listPackages" } as const;
  const packageOwner = requireIdentity(owner, "package owner");
  const cursor = decodeGiteaPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const query = {
    page: cursor.page,
    limit,
    ...(request.query === undefined ? {} : { q: requireIdentity(request.query, "package query") }),
    ...(request.type === undefined ? {} : { type: requireGiteaPackageType(request.type) }),
  };
  const client = await context.client();
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.listPackages(
        {
          path: { owner: packageOwner },
          query,
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requirePackageArray(context, operation.universal, response.body);
  return createPage(
    payloads.map((payload) => normalizeGiteaPackage(client, payload, packageOwner)),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch exactly one page of versions for one known package name and type. */
export async function listGiteaPackageVersions<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  coordinates: PackageCoordinates,
  request: ResolvedPageRequest,
): Promise<Page<PackageVersionData<"gitea", TVersion>>> {
  const operation = {
    universal: "listPackageVersions",
    native: "listPackageVersions",
  } as const;
  const path = packagePath(coordinates);
  const client = await context.client();
  const cursor = decodeGiteaPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.listPackageVersions(
        { path, query: { page: cursor.page, limit } },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requirePackageArray(context, operation.universal, response.body);
  return createPage(
    payloads.map((payload) => normalizeGiteaPackage(client, payload, path.owner)),
    giteaPagination(
      context,
      operation,
      response,
      cursor,
      limit,
      payloads.length,
    ),
  );
}

/** Directly read one exact package version. */
export async function getGiteaPackageVersion<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: OperationOptions = {},
): Promise<PackageVersionData<"gitea", TVersion>> {
  const operation = { universal: "getPackageVersion", native: "getPackage" } as const;
  const path = packageVersionPath(identity);
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaPackage, TVersion>(
    context,
    operation,
    () => client.getPackage({ path }, requestOptions(options.signal)),
    options.signal,
    isPackagePayload,
  );
  return normalizeGiteaPackage(client, payload, path.owner);
}

/** Directly find one exact package version, translating only a confirmed 404. */
export async function findGiteaPackageVersion<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: OperationOptions = {},
): Promise<PackageVersionData<"gitea", TVersion> | undefined> {
  const operation = { universal: "findPackageVersion", native: "getPackage" } as const;
  const path = packageVersionPath(identity);
  const client = await context.client();
  const payload = await requestOptionalGiteaBody<AnyGiteaPackage, TVersion>(
    context,
    operation,
    () => client.getPackage({ path }, requestOptions(options.signal)),
    options.signal,
    isPackagePayload,
  );
  return payload === undefined ? undefined : normalizeGiteaPackage(client, payload, path.owner);
}

/** Read package-file metadata directly and fail if the provider exceeds the caller's hard bound. */
export async function listGiteaPackageFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: ListPackageFilesOptions,
): Promise<readonly PackageFileData<"gitea", TVersion>[]> {
  const operation = { universal: "listPackageFiles", native: "listPackageFiles" } as const;
  const maximum = requirePositiveInteger(options.maxFiles, "maximum package files");
  const path = packageVersionPath(identity);
  const client = await context.client();
  const payloads = await requestGiteaBody<readonly AnyGiteaPackageFile[], TVersion>(
    context,
    operation,
    () => client.listPackageFiles({ path }, requestOptions(options.signal)),
    options.signal,
    isPackageFileArray,
  );
  if (payloads.length > maximum) {
    throw new ProviderInvariantError(
      `listPackageFiles returned ${payloads.length} files above the caller limit ${maximum}`,
      { provider: "gitea", version: context.version, operation: "listPackageFiles" },
    );
  }
  return Object.freeze(payloads.map((payload) => normalizeGiteaPackageFile(client, payload)));
}

/** Delete one exact package version directly. */
export async function deleteGiteaPackageVersion<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: OperationOptions = {},
): Promise<void> {
  const operation = {
    universal: "deletePackageVersion",
    native: "deletePackageVersion",
  } as const;
  const path = packageVersionPath(identity);
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () =>
      client.deletePackageVersion(
        { path },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Delete every version of one exact package name/type directly. */
export async function deleteGiteaPackage<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  coordinates: PackageCoordinates,
  options: OperationOptions = {},
): Promise<void> {
  const operation = { universal: "deletePackage", native: "deletePackage" } as const;
  const path = packagePath(coordinates);
  const client = await context.client();
  await requestGitea(
    context,
    operation,
    () => client.deletePackage({ path }, requestOptions(options.signal)),
    options.signal,
  );
}

export function normalizeGiteaPackage<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaPackageEntityPayload<TVersion, "package">,
  fallbackOwner: string,
): PackageVersionData<"gitea", TVersion> {
  if (!isPackagePayload(payload)) throw new TypeError("malformed Gitea package payload");
  const owner = payload.owner?.login ?? requireIdentity(fallbackOwner, "package owner");
  return Object.freeze({
    id: String(payload.id),
    owner,
    type: payload.type!,
    name: payload.name!,
    version: payload.version!,
    ...(payload.created_at === undefined ? {} : { createdAt: payload.created_at }),
    ...(payload.creator?.login === undefined ? {} : { creator: payload.creator.login }),
    ...(payload.repository?.full_name === undefined
      ? {}
      : { repositoryFullName: payload.repository.full_name }),
    ...(payload.html_url === undefined ? {} : { url: payload.html_url }),
    native: createGiteaPackageEntityNative("package", client, payload),
  });
}

export function normalizeGiteaPackageFile<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaPackageEntityPayload<TVersion, "packageFile">,
): PackageFileData<"gitea", TVersion> {
  if (!isPackageFilePayload(payload)) throw new TypeError("malformed Gitea package-file payload");
  return Object.freeze({
    id: String(payload.id),
    name: payload.name!,
    ...(payload.size === undefined ? {} : { size: safeNonNegativeInteger(payload.size) }),
    digests: Object.freeze({
      ...(payload.md5 === undefined ? {} : { md5: payload.md5 }),
      ...(payload.sha1 === undefined ? {} : { sha1: payload.sha1 }),
      ...(payload.sha256 === undefined ? {} : { sha256: payload.sha256 }),
      ...(payload.sha512 === undefined ? {} : { sha512: payload.sha512 }),
    }),
    native: createGiteaPackageEntityNative("packageFile", client, payload),
  });
}

function requirePackageArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyGiteaPackage[] {
  if (!Array.isArray(value) || !value.every(isPackagePayload)) {
    throw new ProviderInvariantError(`${operation} returned a malformed package list`, {
      provider: "gitea",
      version: context.version,
      operation,
    });
  }
  return value;
}

function isPackagePayload(value: unknown): value is AnyGiteaPackage {
  if (typeof value !== "object" || value === null) return false;
  const packageValue = value as AnyGiteaPackage;
  return (typeof packageValue.id === "number" || typeof packageValue.id === "bigint") &&
    packageValue.id > 0 && typeof packageValue.name === "string" &&
    packageValue.name.length > 0 && typeof packageValue.type === "string" &&
    packageValue.type.length > 0 && typeof packageValue.version === "string" &&
    packageValue.version.length > 0;
}

function isPackageFileArray(value: unknown): value is readonly AnyGiteaPackageFile[] {
  return Array.isArray(value) && value.every(isPackageFilePayload);
}

function isPackageFilePayload(value: unknown): value is AnyGiteaPackageFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as AnyGiteaPackageFile;
  return (typeof file.id === "number" || typeof file.id === "bigint") && file.id > 0 &&
    typeof file.name === "string" && file.name.length > 0 &&
    (file.size === undefined || isSafeNonNegativeInteger(file.size));
}

function packagePath(coordinates: PackageCoordinates) {
  return {
    owner: requireIdentity(coordinates.owner, "package owner"),
    type: requireGiteaPackageType(coordinates.type),
    name: requireIdentity(coordinates.name, "package name"),
  };
}

function packageVersionPath(identity: PackageVersionIdentity) {
  return {
    ...packagePath(identity),
    version: requireIdentity(identity.version, "package version"),
  };
}

function requireGiteaPackageType(value: string): GiteaPackageType {
  const type = requireIdentity(value, "package type");
  if (!(GITEA_PACKAGE_TYPES as readonly string[]).includes(type)) {
    throw new TypeError(`unsupported Gitea package type: ${type}`);
  }
  return type as GiteaPackageType;
}

function safeNonNegativeInteger(value: number | bigint): number {
  const number = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError("Gitea returned an invalid package-file size");
  }
  return number;
}

function isSafeNonNegativeInteger(value: number | bigint): boolean {
  const number = typeof value === "bigint" ? Number(value) : value;
  return Number.isSafeInteger(number) && number >= 0;
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}
