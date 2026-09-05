import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaBranchRuleEntityPayload } from "../native/GiteaBranchRuleNative.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

export type AnyGiteaRule = GiteaBranchRuleEntityPayload<GiteaVersion, "configuredRule">;

export type AnyGiteaBranch = GiteaBranchRuleEntityPayload<GiteaVersion, "effectiveProtection">;

export function requireRuleArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: unknown,
): readonly AnyGiteaRule[] {
  if (!Array.isArray(value) || !value.every(isRulePayload)) {
    throw invariant(context, operation, "returned a malformed branch-rule list");
  }
  return value;
}

export function isRulePayload(value: unknown): value is AnyGiteaRule {
  return typeof value === "object" && value !== null &&
    typeof (value as AnyGiteaRule).rule_name === "string" &&
    (value as AnyGiteaRule).rule_name!.length > 0;
}

export function isBranchPayload(value: unknown): value is AnyGiteaBranch {
  return typeof value === "object" && value !== null &&
    typeof (value as AnyGiteaBranch).name === "string" &&
    (value as AnyGiteaBranch).name!.length > 0 &&
    typeof (value as AnyGiteaBranch).protected === "boolean";
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

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
): ProviderInvariantError {
  return new ProviderInvariantError(`${operation} ${message}`, {
    provider: "gitea",
    version: context.version,
    operation,
  });
}
