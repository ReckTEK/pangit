import type { ResolvedCookiePolicy } from "./contracts.ts";
import { invalidCookie } from "./validation.ts";

export function serializeCookie(
  value: string,
  maxAgeSeconds: number,
  policy: ResolvedCookiePolicy,
): string {
  const attributes = [
    policy.name + "=" + value,
    "Path=" + policy.path,
    "Max-Age=" + maxAgeSeconds,
  ];
  if (policy.domain !== undefined) attributes.push("Domain=" + policy.domain);
  attributes.push("HttpOnly");
  if (policy.secure) attributes.push("Secure");
  attributes.push("SameSite=" + policy.sameSite);
  return attributes.join("; ");
}

export function readCookieValue(header: string, name: string): string | undefined {
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
}

export function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw invalidCookie();
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
