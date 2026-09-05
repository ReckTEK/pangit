import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { IssueState } from "../../../fluent-api/adapter-contract/optional/issues.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaIssueEntityPayload } from "../native/GiteaIssueNative.ts";

export type AnyGiteaIssue = GiteaIssueEntityPayload<GiteaVersion, "issue">;

export type AnyGiteaComment = GiteaIssueEntityPayload<GiteaVersion, "issueComment">;

export function requireIssueArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaIssue[] {
  if (Array.isArray(response.body) && response.body.every(isIssuePayload)) return response.body;
  throw invariant(context, operation, "returned malformed issue data", response);
}

export function requireCommentArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaComment[] {
  if (Array.isArray(response.body) && response.body.every(isCommentPayload)) return response.body;
  throw invariant(context, operation, "returned malformed issue-comment data", response);
}

export function optionalIdentity(value: string | undefined, name: string): string | undefined {
  return value === undefined ? undefined : requireIdentity(value, name);
}

export function parsePositiveInt64(value: string, name: string): bigint {
  requireIdentity(value, name);
  if (!/^[1-9]\d*$/.test(value)) throw new TypeError(`${name} must be a positive integer`);
  return BigInt(value);
}

export function requireNonNegativeInteger(value: number | bigint, name: string): void {
  if (
    typeof value === "bigint" ? value < 0n : !Number.isSafeInteger(value) || value < 0
  ) {
    throw new RangeError(`${name} must be a non-negative integer`);
  }
}

export function requiredPositiveNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${name} is missing or outside the safe integer range`);
  }
  return value;
}

export function requiredIssueState(value: unknown, name: string): IssueState {
  if (value === "open" || value === "closed") return value;
  throw new TypeError(`${name} is missing or invalid`);
}

export function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

export function requiredString(value: unknown, name: string): string {
  if (typeof value !== "string") throw new TypeError(`${name} is missing`);
  return value;
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "bigint"
    ? String(value)
    : undefined;
}

export function optionalNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

export function isIssuePayload(value: unknown): value is AnyGiteaIssue {
  if (!isRecord(value)) return false;
  return hasText(value.id) && typeof value.number === "number" && value.number > 0 &&
    hasText(value.title) && (value.state === "open" || value.state === "closed");
}

export function isCommentPayload(value: unknown): value is AnyGiteaComment {
  return isRecord(value) && hasText(value.id) && typeof value.body === "string";
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  detail: string,
  cause: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${detail}`, {
    provider: "gitea",
    version: context.version,
    operation,
    cause,
  });
}
