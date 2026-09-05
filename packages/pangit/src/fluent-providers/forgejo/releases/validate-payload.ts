import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoReleaseEntityPayload } from "../native/ForgejoReleaseNative.ts";

export type AnyForgejoRelease = ForgejoReleaseEntityPayload<ForgejoVersion, "release">;

export type AnyForgejoReleaseAsset = ForgejoReleaseEntityPayload<ForgejoVersion, "releaseAsset">;

export function requireReleaseArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyForgejoRelease[] {
  if (Array.isArray(response.body) && response.body.every(isReleasePayload)) return response.body;
  throw invariant(context, operation, "returned malformed release data", response);
}

export function requireAssetArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyForgejoReleaseAsset[] {
  if (Array.isArray(response.body) && response.body.every(isAssetPayload)) return response.body;
  throw invariant(context, operation, "returned malformed release-asset data", response);
}

export function optionalIdentity(value: string | undefined, name: string): string | undefined {
  return value === undefined ? undefined : requireIdentity(value, name);
}

export function parsePositiveInt64(value: string, name: string): bigint {
  requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(value)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(value);
}

export function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

export function optionalInt64(value: unknown): number | bigint | undefined {
  return typeof value === "bigint" && value >= 0n ||
      typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : undefined;
}

export function isReleasePayload(value: unknown): value is AnyForgejoRelease {
  return isRecord(value) && hasText(value.id) && hasText(value.tag_name);
}

export function isAssetPayload(value: unknown): value is AnyForgejoReleaseAsset {
  return isRecord(value) && hasText(value.id) && hasText(value.name);
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function invariant<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  detail: string,
  cause: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${detail}`, {
    provider: "forgejo",
    version: context.version,
    operation,
    cause,
  });
}
