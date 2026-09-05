import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoRepositoryPayload } from "../native/ForgejoRepositoryNative.ts";

export type AnyForgejoRepository = ForgejoRepositoryPayload<ForgejoVersion>;

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

/** Validate the fields required to normalize one generated repository payload. */
export function isForgejoRepositoryPayload(value: unknown): value is AnyForgejoRepository {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const repository = value as AnyForgejoRepository;
  const fullName = optionalText(repository.full_name);
  if (
    !hasText(repository.name) || !hasText(repository.id) ||
    (!hasText(repository.owner?.login) && !hasText(fullName?.split("/")[0]))
  ) return false;
  return repository.parent == null || isParentPayload(repository.parent);
}

function isParentPayload(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const repository = value as AnyForgejoRepository;
  const fullName = optionalText(repository.full_name);
  return hasText(repository.name) &&
    (hasText(repository.owner?.login) || hasText(fullName?.split("/")[0]));
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}

export function requireRepositoryArray(
  value: unknown,
  context: ForgejoAdapterContext<ForgejoVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyForgejoRepository[] {
  if (Array.isArray(value) && value.every(isForgejoRepositoryPayload)) return value;
  throw new ProviderInvariantError(`${operation} returned malformed repository data`, {
    provider: "forgejo",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}
