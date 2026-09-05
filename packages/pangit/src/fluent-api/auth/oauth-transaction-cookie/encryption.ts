import type { OAuthTransactionCookieSecret } from "./contracts.ts";
export const encoder = new TextEncoder();

const minimumSecretBytes = 32;

export function createEncryptionKey(secret: OAuthTransactionCookieSecret): Promise<CryptoKey> {
  if (isCryptoKey(secret)) {
    if (
      secret.algorithm.name !== "AES-GCM" ||
      !secret.usages.includes("encrypt") ||
      !secret.usages.includes("decrypt")
    ) {
      throw new TypeError("OAuth cookie CryptoKey must support AES-GCM encryption and decryption");
    }
    return Promise.resolve(secret);
  }

  const bytes = typeof secret === "string" ? encoder.encode(secret) : new Uint8Array(secret);
  if (bytes.byteLength < minimumSecretBytes) {
    throw new TypeError(
      "OAuth cookie secret must contain at least " + minimumSecretBytes + " bytes",
    );
  }
  return crypto.subtle.digest("SHA-256", bytes).then((digest) =>
    crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"])
  );
}

function isCryptoKey(value: OAuthTransactionCookieSecret): value is CryptoKey {
  return typeof CryptoKey !== "undefined" && value instanceof CryptoKey;
}
