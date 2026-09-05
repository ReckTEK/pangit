import {
  CapabilityUnavailableError,
  NotFoundError,
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";

import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

export function context(c: GitLabAdapterContext<GitLabVersion>, operation: string) {
  return { provider: "gitlab" as const, version: c.version, operation };
}

export function unavailable(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  reason: string,
): never {
  throw new CapabilityUnavailableError(reason, context(c, operation));
}

export function invalid(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  reason: string,
): never {
  throw new ValidationError(reason, context(c, operation));
}

export function invariant(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  reason: string,
): never {
  throw new ProviderInvariantError(reason, context(c, operation));
}

export async function optional<T>(action: () => Promise<T>): Promise<T | undefined> {
  try {
    return await action();
  } catch (e) {
    if (e instanceof NotFoundError) return undefined;
    throw e;
  }
}
