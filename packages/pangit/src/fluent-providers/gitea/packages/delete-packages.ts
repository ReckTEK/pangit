import type {
  PackageCoordinates,
  PackageVersionIdentity,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";
import type { OperationOptions } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requestGitea } from "../transport/response/mod.ts";
import { packagePath, packageVersionPath, requestOptions } from "./request-options.ts";

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
