import type { CookieOptions, ResolvedCookiePolicy } from "./contracts.ts";

export const defaultName = "pangit_oauth";

export const defaultMaxAgeSeconds = 10 * 60;

export function parseHttpUrl(value: string | URL, label: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError(label + " must use HTTP or HTTPS");
  }
  return url;
}

export function validateCookieOptions(options: CookieOptions): void {
  if (!/^[A-Za-z0-9!#$%&'*+.^_\x60|~-]+$/.test(options.name)) {
    throw new TypeError("OAuth cookie name is invalid");
  }
  if (
    options.path !== undefined &&
    (!options.path.startsWith("/") || options.path.includes(";") ||
      hasCookieControl(options.path))
  ) {
    throw new TypeError("OAuth cookie path is invalid");
  }
  if (
    options.domain !== undefined &&
    (options.domain.length === 0 || /[;,\s]/.test(options.domain) ||
      hasCookieControl(options.domain))
  ) {
    throw new TypeError("OAuth cookie domain is invalid");
  }
  if (options.secure !== undefined && typeof options.secure !== "boolean") {
    throw new TypeError("OAuth cookie secure must be boolean");
  }
  if (!(["Strict", "Lax", "None"] as const).includes(options.sameSite)) {
    throw new TypeError("OAuth cookie sameSite must be Strict, Lax, or None");
  }
  if (options.sameSite === "None" && options.secure === false) {
    throw new TypeError("OAuth cookies using SameSite=None must also use Secure");
  }
  if (
    !Number.isSafeInteger(options.maxAgeSeconds) || options.maxAgeSeconds < 0 ||
    options.maxAgeSeconds > 2_147_483_647
  ) {
    throw new TypeError("OAuth cookie maxAgeSeconds must be a non-negative integer");
  }
}

function hasCookieControl(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function resolveCookiePolicy(
  options: CookieOptions,
  callbackUrl: URL,
): ResolvedCookiePolicy {
  const policy = {
    name: options.name,
    path: options.path ?? callbackUrl.pathname,
    domain: options.domain,
    secure: options.secure ?? callbackUrl.protocol === "https:",
    sameSite: options.sameSite,
  };
  if (policy.sameSite === "None" && !policy.secure) {
    throw new TypeError("OAuth cookies using SameSite=None must also use Secure");
  }
  if (policy.name.startsWith("__Secure-") && !policy.secure) {
    throw new TypeError("OAuth cookies using the __Secure- prefix must use Secure");
  }
  if (
    policy.name.startsWith("__Host-") &&
    (!policy.secure || policy.path !== "/" || policy.domain !== undefined)
  ) {
    throw new TypeError(
      "OAuth cookies using the __Host- prefix must use Secure, Path=/, and no Domain",
    );
  }
  return policy;
}
