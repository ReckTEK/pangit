import { OperationTimeoutError } from "../../../fluent-api/adapter-contract/errors.ts";
import { listForgejoPackageVersions } from "./read-packages.ts";
import type {
  PackageCoordinates,
  PackageVersionIdentity,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requestForgejo } from "../transport/response/mod.ts";
import { packageVersionPath, requestOptions } from "./request-options.ts";

/** Delete one exact package version directly. */
export async function deleteForgejoPackageVersion<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: OperationOptions = {},
): Promise<void> {
  const operation = {
    universal: "deletePackageVersion",
    native: "deletePackage",
  } as const;
  const path = packageVersionPath(identity);
  const client = await context.client();
  await requestForgejo(
    context,
    operation,
    () =>
      client.deletePackage(
        { path },
        requestOptions(options.signal),
      ),
    options.signal,
  );
}

/** Delete every exact matching version after completing bounded discovery. */
export async function deleteForgejoPackage<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  coordinates: PackageCoordinates,
  options: OperationOptions = {},
): Promise<void> {
  const versions: PackageVersionIdentity[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const page = await listForgejoPackageVersions(context, coordinates, {
      limit: 100,
      cursor,
      ...options,
    });
    versions.push(...page.items.map((item) => ({ ...coordinates, version: item.version })));
    cursor = page.nextCursor;
    if (++pages >= 10 && cursor) {
      throw new OperationTimeoutError("Package deletion exceeds its 1000-entry discovery limit", {
        provider: "forgejo",
        version: context.version,
        operation: "deletePackage",
      });
    }
  } while (cursor);
  for (const version of versions) await deleteForgejoPackageVersion(context, version, options);
}
