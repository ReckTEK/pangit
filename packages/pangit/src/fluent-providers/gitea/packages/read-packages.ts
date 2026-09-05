import type {
  ListPackagesRequest,
  PackageCoordinates,
  PackageVersionData,
  PackageVersionIdentity,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";
import {
  type OperationOptions,
  requireIdentity,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type ResolvedPageRequest,
} from "../../../fluent-api/adapter-contract/pagination.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import {
  decodeGiteaPageCursor,
  giteaPagination,
  requestGitea,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "../transport/response/mod.ts";
import { requireGiteaPackageType } from "./support.ts";
import { packagePath, packageVersionPath, requestOptions } from "./request-options.ts";
import { type AnyGiteaPackage, isPackagePayload, requirePackageArray } from "./validate-payload.ts";
import { normalizeGiteaPackage } from "./normalize.ts";

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
