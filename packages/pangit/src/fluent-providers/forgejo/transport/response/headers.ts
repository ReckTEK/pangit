import { ProviderInvariantError } from "../../../../fluent-api/adapter-contract/errors.ts";

import type { ForgejoAdapterContext } from "../ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../../native/ForgejoEntityNative.ts";
import {
  type ForgejoOperation,
  type ForgejoSuccessResponse,
  universalOperation,
} from "./operation.ts";

export function header(headers: Headers, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = headers.get(name);
    if (value !== null && value.length > 0) return value;
  }
  return undefined;
}

export function parseFirstNonNegativeHeader<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  headers: Headers,
  response: ForgejoSuccessResponse,
  ...names: readonly string[]
): number | undefined {
  let name: string | undefined;
  let raw: string | null = null;
  for (const candidate of names) {
    const value = headers.get(candidate);
    if (value !== null) {
      name = candidate;
      raw = value;
      break;
    }
  }
  if (name === undefined || raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ProviderInvariantError(
      `${response.operation.id} returned invalid ${name}`,
      {
        provider: "forgejo",
        version: context.version,
        operation: universalOperation(operation),
        status: response.status,
        cause: response,
      },
    );
  }
  return parsed;
}

export function parseBooleanHeader<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  headers: Headers,
  response: ForgejoSuccessResponse,
  name: string,
): boolean | undefined {
  const raw = headers.get(name)?.toLowerCase();
  if (raw === undefined) return undefined;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new ProviderInvariantError(`${response.operation.id} returned invalid ${name}`, {
    provider: "forgejo",
    version: context.version,
    operation: universalOperation(operation),
    status: response.status,
    cause: response,
  });
}

export function nextPageFromLink(value: string | null): number | undefined {
  if (value === null) return undefined;
  for (const part of value.split(",")) {
    if (!/;\s*rel=(?:"next"|next)(?:;|$)/i.test(part)) continue;
    const target = /<([^>]+)>/.exec(part)?.[1];
    if (target === undefined) continue;
    try {
      const page = Number(new URL(target, "https://pangit.invalid/").searchParams.get("page"));
      if (Number.isSafeInteger(page) && page > 0) return page;
    } catch {
      continue;
    }
  }
  return undefined;
}
