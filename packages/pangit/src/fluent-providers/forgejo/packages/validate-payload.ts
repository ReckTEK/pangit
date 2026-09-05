import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoPackageEntityPayload } from "../native/ForgejoPackageNative.ts";

export type AnyForgejoPackage = ForgejoPackageEntityPayload<ForgejoVersion, "package">;

export type AnyForgejoPackageFile = ForgejoPackageEntityPayload<ForgejoVersion, "packageFile">;

export function requirePackageArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyForgejoPackage[] {
  if (!Array.isArray(value) || !value.every(isPackagePayload)) {
    throw new ProviderInvariantError(`${operation} returned a malformed package list`, {
      provider: "forgejo",
      version: context.version,
      operation,
    });
  }
  return value;
}

export function isPackagePayload(value: unknown): value is AnyForgejoPackage {
  if (typeof value !== "object" || value === null) return false;
  const packageValue = value as AnyForgejoPackage;
  return (typeof packageValue.id === "number" || typeof packageValue.id === "bigint") &&
    packageValue.id > 0 && typeof packageValue.name === "string" &&
    packageValue.name.length > 0 && typeof packageValue.type === "string" &&
    packageValue.type.length > 0 && typeof packageValue.version === "string" &&
    packageValue.version.length > 0;
}

export function isPackageFileArray(value: unknown): value is readonly AnyForgejoPackageFile[] {
  return Array.isArray(value) && value.every(isPackageFilePayload);
}

export function isPackageFilePayload(value: unknown): value is AnyForgejoPackageFile {
  if (typeof value !== "object" || value === null) return false;
  const file = value as AnyForgejoPackageFile;
  return (typeof file.id === "number" || typeof file.id === "bigint") && file.id > 0 &&
    typeof file.name === "string" && file.name.length > 0 &&
    (file.Size === undefined || isSafeNonNegativeInteger(file.Size));
}

export function safeNonNegativeInteger(value: number | bigint): number {
  const number = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(number) || number < 0) {
    throw new TypeError("Forgejo returned an invalid package-file size");
  }
  return number;
}

function isSafeNonNegativeInteger(value: number | bigint): boolean {
  const number = typeof value === "bigint" ? Number(value) : value;
  return Number.isSafeInteger(number) && number >= 0;
}
