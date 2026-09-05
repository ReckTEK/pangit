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

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import {
  decodeForgejoPageCursor,
  forgejoPagination,
  requestForgejo,
  requestForgejoBody,
  requestOptionalForgejoBody,
} from "../transport/response/mod.ts";
import { requireForgejoPackageType } from "./support.ts";
import { packagePath, packageVersionPath, requestOptions } from "./request-options.ts";
import {
  type AnyForgejoPackage,
  isPackagePayload,
  requirePackageArray,
} from "./validate-payload.ts";
import { normalizeForgejoPackage } from "./normalize.ts";

/** Fetch exactly one provider page of package versions owned by one user or organization. */
export async function listForgejoPackages<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  owner: string,
  request: ListPackagesRequest,
): Promise<Page<PackageVersionData<"forgejo", TVersion>>> {
  const operation = { universal: "listPackages", native: "listPackages" } as const;
  const packageOwner = requireIdentity(owner, "package owner");
  const cursor = decodeForgejoPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const query = {
    page: cursor.page,
    limit,
    ...(request.query === undefined ? {} : { q: requireIdentity(request.query, "package query") }),
    ...(request.type === undefined ? {} : { type: requireForgejoPackageType(request.type) }),
  };
  const client = await context.client();
  const response = await requestForgejo(
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
    payloads.map((payload) => normalizeForgejoPackage(client, payload, packageOwner)),
    forgejoPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch exactly one page of versions for one known package name and type. */
export async function listForgejoPackageVersions<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  coordinates: PackageCoordinates,
  request: ResolvedPageRequest,
): Promise<Page<PackageVersionData<"forgejo", TVersion>>> {
  const operation = {
    universal: "listPackageVersions",
    native: "listPackages",
  } as const;
  const path = packagePath(coordinates);
  const client = await context.client();
  const cursor = decodeForgejoPageCursor(request.cursor, { version: context.version, operation });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestForgejo(
    context,
    operation,
    () =>
      client.listPackages(
        {
          path: { owner: path.owner },
          query: { page: cursor.page, limit, type: path.type, q: path.name },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requirePackageArray(context, operation.universal, response.body);
  return createPage(
    payloads.filter((payload) => payload.name === path.name && payload.type === path.type)
      .map((payload) => normalizeForgejoPackage(client, payload, path.owner)),
    forgejoPagination(
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
export async function getForgejoPackageVersion<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: OperationOptions = {},
): Promise<PackageVersionData<"forgejo", TVersion>> {
  const operation = { universal: "getPackageVersion", native: "getPackage" } as const;
  const path = packageVersionPath(identity);
  const client = await context.client();
  const payload = await requestForgejoBody<AnyForgejoPackage, TVersion>(
    context,
    operation,
    () => client.getPackage({ path }, requestOptions(options.signal)),
    options.signal,
    isPackagePayload,
  );
  return normalizeForgejoPackage(client, payload, path.owner);
}

/** Directly find one exact package version, translating only a confirmed 404. */
export async function findForgejoPackageVersion<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: OperationOptions = {},
): Promise<PackageVersionData<"forgejo", TVersion> | undefined> {
  const operation = { universal: "findPackageVersion", native: "getPackage" } as const;
  const path = packageVersionPath(identity);
  const client = await context.client();
  const payload = await requestOptionalForgejoBody<AnyForgejoPackage, TVersion>(
    context,
    operation,
    () => client.getPackage({ path }, requestOptions(options.signal)),
    options.signal,
    isPackagePayload,
  );
  return payload === undefined ? undefined : normalizeForgejoPackage(client, payload, path.owner);
}
