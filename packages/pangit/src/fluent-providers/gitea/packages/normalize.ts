import type {
  PackageFileData,
  PackageVersionData,
} from "../../../fluent-api/adapter-contract/optional/packages.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  createGiteaPackageEntityNative,
  type GiteaPackageEntityPayload,
} from "../native/GiteaPackageNative.ts";

import {
  isPackageFilePayload,
  isPackagePayload,
  safeNonNegativeInteger,
} from "./validate-payload.ts";

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
