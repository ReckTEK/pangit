import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../../adapter-contract/provider.ts";

import type { OAuthLoginTransaction, OAuthLoginTransactionFor } from "../oauth-contracts.ts";
import { OAuthCallbackError } from "../OAuthCallbackError.ts";
import type {
  CookieOptions,
  CookiePayload,
  OAuthTransactionCookie,
  OAuthTransactionCookieOptions,
} from "./contracts.ts";

import {
  defaultMaxAgeSeconds,
  defaultName,
  parseHttpUrl,
  resolveCookiePolicy,
  validateCookieOptions,
} from "./policy.ts";

import { createEncryptionKey, encoder } from "./encryption.ts";
import {
  invalidCookie,
  payloadVersion,
  validatePayload,
  validateTransaction,
} from "./validation.ts";

import {
  decodeBase64Url,
  encodeBase64Url,
  readCookieValue,
  serializeCookie,
} from "./serialization.ts";

const decoder = new TextDecoder();

/** Build an encrypted OAuth transaction cookie using only standard Web APIs. */
export function createOAuthTransactionCookie<
  TProvider extends FluentProvider = FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  options: OAuthTransactionCookieOptions,
): OAuthTransactionCookie<TProvider, TRegistry> {
  return new OAuthTransactionCookieImpl<TProvider, TRegistry>(options);
}

class OAuthTransactionCookieImpl<
  TProvider extends FluentProvider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> implements OAuthTransactionCookie<TProvider, TRegistry> {
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
    TVersion extends ProviderVersion<TSelected, TRegistry>,
  >(
    transaction: OAuthLoginTransaction<TSelected, TVersion, TRegistry>,
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
  ): Promise<OAuthLoginTransactionFor<TProvider, TRegistry> | undefined> {
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
    return payload.transaction as OAuthLoginTransactionFor<TProvider, TRegistry>;
  }

  clear(request: Request): string {
    const callbackUrl = parseHttpUrl(request.url, "OAuth callback request URL");
    return serializeCookie("", 0, resolveCookiePolicy(this.#options, callbackUrl)) +
      "; Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}
