import { ProviderInvariantError } from "../../../fluent-api/adapter-contract/errors.ts";

import type { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

type TokenPayload = {
  access_token?: unknown;
  token_type?: unknown;
  expires_in?: unknown;
  refresh_token?: unknown;
  scope?: unknown;
};

export async function readTokenPayload(response: Response): Promise<TokenPayload> {
  const text = await response.text();
  if (text.length === 0) return {};
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : {};
  } catch {
    return Object.fromEntries(new URLSearchParams(text));
  }
}

export function requiredTokenString<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: string,
  value: unknown,
  name: string,
): string {
  const parsed = optionalString(value);
  if (parsed !== undefined && parsed.length > 0) return parsed;
  throw new ProviderInvariantError(`OAuth token response has no ${name}`, {
    provider: "gitlab",
    version: context.version,
    operation,
  });
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function optionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.length === 0) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
