import type { FluentProvider } from "../../adapter-contract/provider.ts";
import type { OAuthLoginTransactionFor } from "../oauth-contracts.ts";
import { OAuthCallbackError } from "../OAuthCallbackError.ts";
import type { CookiePayload } from "./contracts.ts";
export const payloadVersion = 1;
import { parseHttpUrl } from "./policy.ts";

export function validatePayload(value: unknown): CookiePayload {
  if (
    !isRecord(value) || value.version !== payloadVersion || !Number.isSafeInteger(value.expiresAt)
  ) {
    throw invalidCookie();
  }
  return {
    version: payloadVersion,
    expiresAt: value.expiresAt as number,
    transaction: validateTransaction(value.transaction),
  };
}

export function validateTransaction(value: unknown): OAuthLoginTransactionFor<FluentProvider> {
  if (!isRecord(value) || !isProvider(value.provider)) throw invalidCookie();
  const provider = value.provider;
  if (
    typeof value.version !== "string" ||
    !nonEmptyString(value.version) ||
    !nonEmptyString(value.state) ||
    !nonEmptyString(value.codeVerifier) ||
    !nonEmptyString(value.callbackUrl)
  ) {
    throw invalidCookie();
  }
  try {
    parseHttpUrl(value.callbackUrl, "OAuth transaction callbackUrl");
  } catch {
    throw invalidCookie();
  }
  if (value.providerTransaction !== undefined && !isStringRecord(value.providerTransaction)) {
    throw invalidCookie();
  }
  return Object.freeze({
    provider,
    version: value.version,
    state: value.state,
    codeVerifier: value.codeVerifier,
    callbackUrl: value.callbackUrl,
    ...(value.providerTransaction === undefined
      ? {}
      : isStringRecord(value.providerTransaction)
      ? { providerTransaction: Object.freeze({ ...value.providerTransaction }) }
      : {}),
  }) as OAuthLoginTransactionFor<FluentProvider>;
}

function isProvider(value: unknown): value is FluentProvider {
  return nonEmptyString(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function invalidCookie(): OAuthCallbackError {
  return new OAuthCallbackError("invalid_transaction", "Invalid OAuth transaction cookie");
}
