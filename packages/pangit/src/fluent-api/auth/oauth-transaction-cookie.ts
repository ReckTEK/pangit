import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import { restClientVersions } from "../../generated-rest-clients/supported-versions.ts";
import type { OAuthLoginTransaction, OAuthLoginTransactionFor } from "./oauth-contracts.ts";
import { OAuthCallbackError } from "./OAuthCallbackError.ts";

const payloadVersion = 1;
const defaultName = "pangit_oauth";
const defaultMaxAgeSeconds = 10 * 60;
const minimumSecretBytes = 32;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type OAuthCookieSameSite = "Strict" | "Lax" | "None";
export type OAuthTransactionCookieSecret = string | Uint8Array | CryptoKey;
export type OAuthTransactionCookieErrorCode = "invalid_transaction" | "expired_transaction";

/** Native cookie policy for one short-lived OAuth login transaction. */
export interface OAuthTransactionCookieOptions {
  /** At least 32 bytes, or an AES-GCM key with encrypt and decrypt usage. */
  readonly secret: OAuthTransactionCookieSecret;
  /** Cookie name. Defaults to `pangit_oauth`. */
  readonly name?: string;
  /** Cookie path. Defaults to the OAuth callback pathname. */
  readonly path?: string;
  /** Optional cookie Domain attribute. Omitted by default. */
  readonly domain?: string;
  /** Secure attribute. Defaults to whether the OAuth callback uses HTTPS. */
  readonly secure?: boolean;
  /** SameSite policy. Defaults to `Lax`. */
  readonly sameSite?: OAuthCookieSameSite;
  /** Cookie and encrypted-payload lifetime in seconds. Defaults to 600. */
  readonly maxAgeSeconds?: number;
}

/**
 * Framework-neutral encrypted transaction storage for an OAuth callback cookie.
 *
 * Set and clear return native Set-Cookie header values. Read consumes the native
 * callback request and needs no HTTP framework adapter. Cookies are always HttpOnly.
 */
export interface OAuthTransactionCookie<TProvider extends Provider = Provider> {
  readonly name: string;

  set<
    TSelected extends TProvider,
    TVersion extends ProviderVersion<TSelected>,
  >(
    transaction: OAuthLoginTransaction<TSelected, TVersion>,
  ): Promise<string>;

  read(
    request: Request,
  ): Promise<OAuthLoginTransactionFor<TProvider> | undefined>;

  clear(request: Request): string;
}

interface CookiePayload {
  readonly version: typeof payloadVersion;
  readonly expiresAt: number;
  readonly transaction: OAuthLoginTransactionFor<Provider>;
}

interface CookieOptions {
  readonly name: string;
  readonly path?: string;
  readonly domain?: string;
  readonly secure?: boolean;
  readonly sameSite: OAuthCookieSameSite;
  readonly maxAgeSeconds: number;
}

interface ResolvedCookiePolicy {
  readonly name: string;
  readonly path: string;
  readonly domain?: string;
  readonly secure: boolean;
  readonly sameSite: OAuthCookieSameSite;
}

/** Build an encrypted OAuth transaction cookie using only standard Web APIs. */
export function createOAuthTransactionCookie<TProvider extends Provider = Provider>(
  options: OAuthTransactionCookieOptions,
): OAuthTransactionCookie<TProvider> {
  return new OAuthTransactionCookieImpl<TProvider>(options);
}

class OAuthTransactionCookieImpl<TProvider extends Provider>
  implements OAuthTransactionCookie<TProvider> {
  readonly name: string;
  readonly #options: CookieOptions;
  readonly #key: Promise<CryptoKey>;
  readonly #additionalData: Uint8Array;

  constructor(options: OAuthTransactionCookieOptions) {
    this.name = options.name ?? defaultName;
    this.#options = Object.freeze({
      name: this.name,
      path: options.path,
      domain: options.domain,
      secure: options.secure,
      sameSite: options.sameSite ?? "Lax",
      maxAgeSeconds: options.maxAgeSeconds ?? defaultMaxAgeSeconds,
    });
    validateCookieOptions(this.#options);
    this.#key = createEncryptionKey(options.secret);
    this.#additionalData = encoder.encode(
      "pangit:oauth-cookie:" + payloadVersion + ":" + this.name,
    );
  }

  async set<
    TSelected extends TProvider,
    TVersion extends ProviderVersion<TSelected>,
  >(
    transaction: OAuthLoginTransaction<TSelected, TVersion>,
  ): Promise<string> {
    const validated = validateTransaction(transaction);
    const callbackUrl = parseHttpUrl(validated.callbackUrl, "OAuth transaction callbackUrl");
    const payload: CookiePayload = {
      version: payloadVersion,
      expiresAt: Date.now() + this.#options.maxAgeSeconds * 1_000,
      transaction: validated,
    };
    const initializationVector = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: initializationVector,
          additionalData: this.#additionalData.buffer as ArrayBuffer,
        },
        await this.#key,
        encoder.encode(JSON.stringify(payload)),
      ),
    );
    const token = "v" + payloadVersion + "." + encodeBase64Url(initializationVector) + "." +
      encodeBase64Url(ciphertext);
    return serializeCookie(
      token,
      this.#options.maxAgeSeconds,
      resolveCookiePolicy(this.#options, callbackUrl),
    );
  }

  async read(
    request: Request,
  ): Promise<OAuthLoginTransactionFor<TProvider> | undefined> {
    const token = readCookieValue(request.headers.get("cookie") ?? "", this.name);
    if (token === undefined) return undefined;

    const parts = token.split(".");
    if (parts.length !== 3 || parts[0] !== "v" + payloadVersion) throw invalidCookie();

    let plaintext: ArrayBuffer;
    try {
      const initializationVector = decodeBase64Url(parts[1]);
      const ciphertext = decodeBase64Url(parts[2]);
      if (initializationVector.byteLength !== 12 || ciphertext.byteLength < 16) {
        throw invalidCookie();
      }
      plaintext = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: initializationVector.buffer as ArrayBuffer,
          additionalData: this.#additionalData.buffer as ArrayBuffer,
        },
        await this.#key,
        ciphertext.buffer as ArrayBuffer,
      );
    } catch (error) {
      if (error instanceof OAuthCallbackError) throw error;
      throw invalidCookie();
    }

    let value: unknown;
    try {
      value = JSON.parse(decoder.decode(plaintext));
    } catch {
      throw invalidCookie();
    }
    const payload = validatePayload(value);
    if (payload.expiresAt <= Date.now()) {
      throw new OAuthCallbackError(
        "expired_transaction",
        "OAuth transaction cookie expired",
      );
    }
    return payload.transaction as OAuthLoginTransactionFor<TProvider>;
  }

  clear(request: Request): string {
    const callbackUrl = parseHttpUrl(request.url, "OAuth callback request URL");
    return serializeCookie("", 0, resolveCookiePolicy(this.#options, callbackUrl)) +
      "; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

function parseHttpUrl(value: string | URL, label: string): URL {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new TypeError(label + " must use HTTP or HTTPS");
  }
  return url;
}

function validateCookieOptions(options: CookieOptions): void {
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

function resolveCookiePolicy(options: CookieOptions, callbackUrl: URL): ResolvedCookiePolicy {
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

function serializeCookie(
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

function createEncryptionKey(secret: OAuthTransactionCookieSecret): Promise<CryptoKey> {
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

function readCookieValue(header: string, name: string): string | undefined {
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim();
    }
  }
}

function validatePayload(value: unknown): CookiePayload {
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

function validateTransaction(value: unknown): OAuthLoginTransactionFor<Provider> {
  if (!isRecord(value) || !isProvider(value.provider)) throw invalidCookie();
  const provider = value.provider;
  if (
    typeof value.version !== "string" ||
    !(restClientVersions[provider] as readonly string[]).includes(value.version) ||
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
  return Object.freeze({
    provider,
    version: value.version,
    state: value.state,
    codeVerifier: value.codeVerifier,
    callbackUrl: value.callbackUrl,
  }) as OAuthLoginTransactionFor<Provider>;
}

function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && Object.hasOwn(restClientVersions, value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidCookie(): OAuthCallbackError {
  return new OAuthCallbackError("invalid_transaction", "Invalid OAuth transaction cookie");
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw invalidCookie();
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
