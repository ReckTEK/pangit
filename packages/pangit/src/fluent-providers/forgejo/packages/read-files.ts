import type { ForgejoProviderTypes } from "../provider-types.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ListPackageFilesOptions,
  PackageFileData,
  PackageVersionIdentity,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { requestForgejoBody } from "../transport/response/mod.ts";
import { packageVersionPath, requestOptions } from "./request-options.ts";

import { type AnyForgejoPackageFile, isPackageFileArray } from "./validate-payload.ts";

import { normalizeForgejoPackageFile } from "./normalize.ts";

/** Read package-file metadata directly and fail if the provider exceeds the caller's hard bound. */
export async function listForgejoPackageFiles<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  identity: PackageVersionIdentity,
  options: ListPackageFilesOptions,
): Promise<readonly PackageFileData<"forgejo", TVersion, ForgejoProviderTypes>[]> {
  const operation = { universal: "listPackageFiles", native: "listPackageFiles" } as const;
  const maximum = requirePositiveInteger(options.maxFiles, "maximum package files");
  const path = packageVersionPath(identity);
  const client = await context.client();
  const payloads = await requestForgejoBody<readonly AnyForgejoPackageFile[], TVersion>(
    context,
    operation,
    () => client.listPackageFiles({ path }, requestOptions(options.signal)),
    options.signal,
    isPackageFileArray,
  );
  if (payloads.length > maximum) {
    throw new ProviderInvariantError(
      `listPackageFiles returned ${payloads.length} files above the caller limit ${maximum}`,
      { provider: "forgejo", version: context.version, operation: "listPackageFiles" },
    );
  }
  return Object.freeze(payloads.map((payload) => normalizeForgejoPackageFile(client, payload)));
}
