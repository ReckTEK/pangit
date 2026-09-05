import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";

import type { CommitFacets } from "../../../fluent-api/adapter-contract/commits.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaOperationIdentity } from "../transport/response/mod.ts";

import type { AnyGiteaCommit } from "./payload-types.ts";
import { invariant } from "./errors.ts";

export function requireCommitArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
  facets: CommitFacets = {},
): readonly AnyGiteaCommit[] {
  if (
    Array.isArray(response.body) &&
    response.body.every((value) => isCommitPayloadForFacets(value, facets))
  ) return response.body;
  throw invariant(context, operation, "provider returned malformed commit data", response);
}

export function isCommitPayload(value: unknown): value is AnyGiteaCommit {
  if (!isRecord(value) || !hasText(value.sha) || !isRecord(value.commit)) return false;
  if (typeof value.commit.message !== "string") return false;
  return value.parents === undefined ||
    Array.isArray(value.parents) &&
      value.parents.every((parent) => isRecord(parent) && hasText(parent.sha));
}

export function isCommitPayloadForFacets(
  value: unknown,
  facets: CommitFacets,
): value is AnyGiteaCommit {
  if (!isCommitPayload(value)) return false;
  if (
    facets.files === true &&
    (!Array.isArray(value.files) ||
      value.files.some((file) =>
        !isRecord(file) || !hasText(file.filename) ||
        file.status !== undefined && typeof file.status !== "string"
      ))
  ) return false;
  if (facets.stats === true && !isCommitStats(value.stats)) return false;
  if (
    facets.verification === true &&
    typeof value.commit?.verification?.verified !== "boolean"
  ) return false;
  return true;
}

function isCommitStats(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  if (value.additions !== undefined && optionalNonNegativeInteger(value.additions) === undefined) {
    return false;
  }
  return value.deletions === undefined || optionalNonNegativeInteger(value.deletions) !== undefined;
}

export function requiredDate(value: string, name: string): string {
  return requireIdentity(value, `${name} date`);
}

export function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function requiredBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${name} is missing`);
  return value;
}

export function optionalNonNegativeInteger(value: unknown): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
    ? Number(value)
    : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
