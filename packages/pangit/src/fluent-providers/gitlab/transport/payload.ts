import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { invalid, invariant } from "./errors.ts";

export type Dto = Record<string, unknown>;

export function object(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): Dto {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return invariant(c, operation, "GitLab returned a malformed object");
  }
  return value as Dto;
}

export function array(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): Dto[] {
  if (!Array.isArray(value)) {
    return invariant(c, operation, "GitLab returned a malformed collection");
  }
  return value.map((v) => object(c, operation, v));
}

export function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function id(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): string {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "bigint" && value >= 0n) return String(value);
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return invariant(c, operation, "GitLab returned a missing or unsafe identity");
}

export function number(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): number {
  const n = typeof value === "bigint" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n < 0) {
    return invariant(c, operation, "GitLab returned an invalid count");
  }
  return n;
}

export function required(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: unknown,
): string {
  if (typeof value !== "string") return invariant(c, operation, "GitLab returned a missing string");
  return value;
}

export function numericId(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  value: string,
) {
  if (!/^\d+$/.test(value)) invalid(c, operation, "GitLab operation requires a numeric ID");
  return number(c, operation, BigInt(value));
}
