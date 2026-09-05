import type { ForgejoProviderTypes } from "../provider-types.ts";
import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import type { BranchData } from "../../../fluent-api/adapter-contract/branches.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import {
  createForgejoEntityNative,
  type ForgejoClient,
  type ForgejoEntityPayload,
  type ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";

export type AnyForgejoBranch = ForgejoEntityPayload<ForgejoVersion, "branch">;

/** Normalize one exact generated branch payload. */
export function normalizeForgejoBranch<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  branch: AnyForgejoBranch,
): BranchData<"forgejo", TVersion, ForgejoProviderTypes> {
  const name = requiredText(branch.name, "branch name");
  const sha = requiredText(branch.commit?.id, `branch ${name} commit SHA`);
  return Object.freeze({
    name,
    sha,
    ...(typeof branch.protected === "boolean" ? { protected: branch.protected } : {}),
    native: createForgejoEntityNative(
      "branch",
      client,
      branch as ForgejoEntityPayload<TVersion, "branch">,
    ),
  });
}

export function requireBranchArray<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyForgejoBranch[] {
  if (Array.isArray(response.body) && response.body.every(isBranchPayload)) {
    return response.body;
  }
  throw new ProviderInvariantError(`${operation} returned malformed branch data`, {
    provider: "forgejo",
    version: context.version,
    operation,
    status: response.status,
    cause: response,
  });
}

function requiredText(value: unknown, name: string): string {
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

export function isBranchPayload(value: unknown): value is AnyForgejoBranch {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const branch = value as AnyForgejoBranch;
  return hasText(branch.name) && hasText(branch.commit?.id);
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}
