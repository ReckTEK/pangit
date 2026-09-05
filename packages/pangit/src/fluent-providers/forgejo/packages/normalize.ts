import type {
  PackageFileData,
  PackageVersionData,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  createForgejoPackageEntityNative,
  type ForgejoPackageEntityPayload,
} from "../native/ForgejoPackageNative.ts";

import {
  isPackageFilePayload,
  isPackagePayload,
  safeNonNegativeInteger,
} from "./validate-payload.ts";

export function normalizeForgejoPackage<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  payload: ForgejoPackageEntityPayload<TVersion, "package">,
  fallbackOwner: string,
): PackageVersionData<"forgejo", TVersion> {
  if (!isPackagePayload(payload)) throw new TypeError("malformed Forgejo package payload");
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
    native: createForgejoPackageEntityNative("package", client, payload),
  });
}

export function normalizeForgejoPackageFile<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  payload: ForgejoPackageEntityPayload<TVersion, "packageFile">,
): PackageFileData<"forgejo", TVersion> {
  if (!isPackageFilePayload(payload)) throw new TypeError("malformed Forgejo package-file payload");
  return Object.freeze({
    id: String(payload.id),
    name: payload.name!,
    ...(payload.Size === undefined ? {} : { size: safeNonNegativeInteger(payload.Size) }),
    digests: Object.freeze({
      ...(payload.md5 === undefined ? {} : { md5: payload.md5 }),
      ...(payload.sha1 === undefined ? {} : { sha1: payload.sha1 }),
      ...(payload.sha256 === undefined ? {} : { sha256: payload.sha256 }),
      ...(payload.sha512 === undefined ? {} : { sha512: payload.sha512 }),
    }),
    native: createForgejoPackageEntityNative("packageFile", client, payload),
  });
}
