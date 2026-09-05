import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaRepositoryPayload } from "../native/GiteaRepositoryNative.ts";

export type AnyGiteaRepository = GiteaRepositoryPayload<GiteaVersion>;

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
export function isGiteaRepositoryPayload(value: unknown): value is AnyGiteaRepository {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const repository = value as AnyGiteaRepository;
  const fullName = optionalText(repository.full_name);
  if (
    !hasText(repository.name) || !hasText(repository.id) ||
    (!hasText(repository.owner?.login) && !hasText(fullName?.split("/")[0]))
  ) return false;
  return repository.parent === undefined || isParentPayload(repository.parent);
}

function isParentPayload(value: unknown): boolean {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const repository = value as AnyGiteaRepository;
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
  context: GiteaAdapterContext<GiteaVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaRepository[] {
  if (Array.isArray(value) && value.every(isGiteaRepositoryPayload)) return value;
  throw new ProviderInvariantError(`${operation} returned malformed repository data`, {
    provider: "gitea",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}
