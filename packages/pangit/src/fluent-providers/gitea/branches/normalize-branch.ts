import type { AnyRestResponse } from "../../../generated-rest-clients/runtime/mod.ts";
import type { BranchData } from "../../../fluent-api/adapter-contract/branches.ts";
import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  createGiteaEntityNative,
  type GiteaClient,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "../native/GiteaEntityNative.ts";

export type AnyGiteaBranch = GiteaEntityPayload<GiteaVersion, "branch">;

/** Normalize one exact generated branch payload. */
export function normalizeGiteaBranch<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  branch: AnyGiteaBranch,
): BranchData<"gitea", TVersion> {
  const name = requiredText(branch.name, "branch name");
  const sha = requiredText(branch.commit?.id, `branch ${name} commit SHA`);
  return Object.freeze({
    name,
    sha,
    ...(typeof branch.protected === "boolean" ? { protected: branch.protected } : {}),
    native: createGiteaEntityNative(
      "branch",
      client,
      branch as GiteaEntityPayload<TVersion, "branch">,
    ),
  });
}

export function requireBranchArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  response: AnyRestResponse,
): readonly AnyGiteaBranch[] {
  if (Array.isArray(response.body) && response.body.every(isBranchPayload)) {
    return response.body;
  }
  throw new ProviderInvariantError(`${operation} returned malformed branch data`, {
    provider: "gitea",
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

export function isBranchPayload(value: unknown): value is AnyGiteaBranch {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const branch = value as AnyGiteaBranch;
  return hasText(branch.name) && hasText(branch.commit?.id);
}

function hasText(value: unknown): boolean {
  const text = optionalText(value);
  return text !== undefined && text.trim().length > 0;
}
