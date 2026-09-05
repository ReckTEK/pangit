import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaPackageEntityPayload } from "../native/GiteaPackageNative.ts";

export type AnyGiteaPackage = GiteaPackageEntityPayload<GiteaVersion, "package">;

export type AnyGiteaPackageFile = GiteaPackageEntityPayload<GiteaVersion, "packageFile">;

export function requirePackageArray<TVersion extends GiteaVersion>(
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

export function isPackagePayload(value: unknown): value is AnyGiteaPackage {
  if (typeof value !== "object" || value === null) return false;
  const packageValue = value as AnyGiteaPackage;
  return (typeof packageValue.id === "number" || typeof packageValue.id === "bigint") &&
    packageValue.id > 0 && typeof packageValue.name === "string" &&
    packageValue.name.length > 0 && typeof packageValue.type === "string" &&
    packageValue.type.length > 0 && typeof packageValue.version === "string" &&
    packageValue.version.length > 0;
}

export function isPackageFileArray(value: unknown): value is readonly AnyGiteaPackageFile[] {
  return Array.isArray(value) && value.every(isPackageFilePayload);
}

export function isPackageFilePayload(value: unknown): value is AnyGiteaPackageFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as AnyGiteaPackageFile;
  return (typeof file.id === "number" || typeof file.id === "bigint") && file.id > 0 &&
    typeof file.name === "string" && file.name.length > 0 &&
    (file.size === undefined || isSafeNonNegativeInteger(file.size));
}

export function safeNonNegativeInteger(value: number | bigint): number {
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
