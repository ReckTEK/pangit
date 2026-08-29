const cookieName = "pangit_example_oauth";
const lifetimeSeconds = 10 * 60;
const encoder = new TextEncoder();

export interface StoredOAuthTransaction {
  readonly provider: "gitea";
  readonly version: string;
  readonly state: string;
  readonly codeVerifier: string;
  readonly callbackUrl: string;
}

interface CookiePayload {
  readonly expiresAt: number;
  readonly transaction: StoredOAuthTransaction;
}

function secret(): string {
  const value = Deno.env.get("PANGIT_EXAMPLE_COOKIE_SECRET")?.trim();
  if (!value) throw new Error("PANGIT_EXAMPLE_COOKIE_SECRET is required");
  return value;
}

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll(
    "=",
    "",
  );
}

function decode(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function signingKey(): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(payload: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    encoder.encode(payload),
  );
  return encode(new Uint8Array(signature));
}

function cookieValue(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") ?? "";
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === cookieName) return value.join("=");
  }
}

export async function setTransactionCookie(
  transaction: StoredOAuthTransaction,
): Promise<string> {
  const payload = encode(encoder.encode(JSON.stringify(
    {
      expiresAt: Date.now() + lifetimeSeconds * 1_000,
      transaction,
    } satisfies CookiePayload,
  )));
  return `${cookieName}=${payload}.${await sign(
    payload,
  )}; HttpOnly; SameSite=Lax; Path=/auth/callback; Max-Age=${lifetimeSeconds}`;
}

export function clearTransactionCookie(): string {
  return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/auth/callback; Max-Age=0`;
}

export async function readTransactionCookie(
  request: Request,
): Promise<StoredOAuthTransaction | undefined> {
  const value = cookieValue(request);
  if (!value) return undefined;
  const [payload, signature, ...rest] = value.split(".");
  if (!payload || !signature || rest.length > 0) {
    throw new Error("Invalid OAuth transaction cookie");
  }
  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(),
    decode(signature).buffer as ArrayBuffer,
    encoder.encode(payload),
  );
  if (!valid) throw new Error("Invalid OAuth transaction cookie");

  const parsed = JSON.parse(
    new TextDecoder().decode(decode(payload)),
  ) as CookiePayload;
  if (parsed.expiresAt <= Date.now()) {
    throw new Error("OAuth transaction cookie expired");
  }
  if (
    parsed.transaction.provider !== "gitea" ||
    typeof parsed.transaction.version !== "string" ||
    typeof parsed.transaction.state !== "string" ||
    typeof parsed.transaction.codeVerifier !== "string" ||
    typeof parsed.transaction.callbackUrl !== "string"
  ) {
    throw new Error("Invalid OAuth transaction cookie");
  }
  return parsed.transaction;
}
