import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoBranchRuleEntityPayload } from "../native/ForgejoBranchRuleNative.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

export type AnyForgejoRule = ForgejoBranchRuleEntityPayload<ForgejoVersion, "configuredRule">;

export type AnyForgejoBranch = ForgejoBranchRuleEntityPayload<
  ForgejoVersion,
  "effectiveProtection"
>;

export function requireRuleArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyForgejoRule[] {
  if (!Array.isArray(value) || !value.every(isRulePayload)) {
    throw invariant(context, operation, "returned a malformed branch-rule list");
  }
  return value;
}

export function isRulePayload(value: unknown): value is AnyForgejoRule {
  return typeof value === "object" && value !== null &&
    typeof (value as AnyForgejoRule).rule_name === "string" &&
    (value as AnyForgejoRule).rule_name!.length > 0;
}

export function isBranchPayload(value: unknown): value is AnyForgejoBranch {
  return typeof value === "object" && value !== null &&
    typeof (value as AnyForgejoBranch).name === "string" &&
    (value as AnyForgejoBranch).name!.length > 0 &&
    typeof (value as AnyForgejoBranch).protected === "boolean";
}

export function optionalBoolean<TKey extends string>(key: TKey, value: unknown) {
  return typeof value === "boolean" ? { [key]: value } as { readonly [K in TKey]: boolean } : {};
}

export function requiredBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${name} is missing`);
  return value;
}

export function validTextArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.flatMap((item) => typeof item === "string" ? [item] : [])
    : [];
}

export function optionalNonNegativeInteger(value: unknown): number | undefined {
  if (typeof value !== "number" && typeof value !== "bigint") return undefined;
  const number = typeof value === "bigint" ? Number(value) : value;
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

export function requiredText(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError(`${name} is missing`);
  }
  return value;
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function invariant<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  message: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${message}`, {
    provider: "forgejo",
    version: context.version,
    operation,
  });
}
