import type { GiteaProviderTypes } from "../provider-types.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ListPackageFilesOptions,
  PackageFileData,
  PackageVersionIdentity,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { requestGiteaBody } from "../transport/response/mod.ts";
import { packageVersionPath, requestOptions } from "./request-options.ts";

import { type AnyGiteaPackageFile, isPackageFileArray } from "./validate-payload.ts";

import { normalizeGiteaPackageFile } from "./normalize.ts";

/** Read package-file metadata directly and fail if the provider exceeds the caller's hard bound. */
export async function listGiteaPackageFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: ListPackageFilesOptions,
): Promise<readonly PackageFileData<"gitea", TVersion, GiteaProviderTypes>[]> {
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
