import { createProviderClient } from "../../../../../../packages/pangit/src/generated-rest-clients/create-rest-client.ts";
import type { RestClientTypeMap } from "../../../../../../packages/pangit/src/generated-rest-clients/rest-client-type-map.ts";
import { unwrapRestResponse } from "../../../../../../packages/pangit/src/generated-rest-clients/runtime/mod.ts";
import type { ProviderVersion } from "../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { AuthenticationContractFixtures } from "../../../fluent-api-contracts/authentication/authentication-contract-fixtures.ts";

type GiteaVersion = ProviderVersion<"gitea">;
type GiteaClient<TVersion extends GiteaVersion> = RestClientTypeMap["gitea"][TVersion];

type Cleanup = {
  readonly name: string;
  readonly run: () => Promise<void>;
};

type Form = {
  readonly action: URL;
  readonly values: URLSearchParams;
};

/**
 * Owns the Gitea-only setup needed to prove the universal authentication contract live.
 * Raw API setup and browser-form driving stay outside the behavior contract itself.
 */
export class GiteaAuthenticationFixtureDriver<TVersion extends GiteaVersion> {
  readonly #cleanups: Cleanup[] = [];
  readonly #client: GiteaClient<TVersion>;
  readonly #timeoutMs: number;
  #closed = false;

  private constructor(
    readonly version: TVersion,
    client: GiteaClient<TVersion>,
    timeoutMs: number,
  ) {
    this.#client = client;
    this.#timeoutMs = timeoutMs;
  }

  static async create<const TVersion extends GiteaVersion>(input: {
    readonly version: TVersion;
    readonly apiUrl: string;
    readonly token: string;
    readonly timeoutMs: number;
  }): Promise<GiteaAuthenticationFixtureDriver<TVersion>> {
    const client = await createProviderClient("gitea", input.version, {
      baseUrl: input.apiUrl,
      headers: { Authorization: `token ${input.token}` },
      throwOnError: false,
      useOperationServers: false,
      headerForwarding: "same-origin",
    });
    return new GiteaAuthenticationFixtureDriver(input.version, client, input.timeoutMs);
  }

  /** Create a TOTP user and OAuth application by direct known identities. */
  async createFixtures(input: {
    readonly username: string;
    readonly password: string;
    readonly webBaseUrl: string;
  }): Promise<AuthenticationContractFixtures> {
    this.#requireOpen();
    const suffix = crypto.randomUUID().slice(0, 8);
    const totpUsername = `pge2e-totp-${suffix}`;
    const totpPassword = `Pge2e-Totp-Aa1!${crypto.randomUUID()}`;
    unwrapRestResponse(
      await this.#client.adminCreateUser({
        body: {
          mediaType: "application/json",
          value: {
            username: totpUsername,
            password: totpPassword,
            email: `${totpUsername}@example.invalid`,
            must_change_password: false,
            send_notify: false,
          },
        },
      }, { signal: this.#timeoutSignal() }),
    );
    this.#cleanups.push({
      name: `TOTP user ${totpUsername}`,
      run: async () => {
        const response = await this.#client.adminDeleteUser(
          { path: { username: totpUsername }, query: { purge: true } },
          { signal: this.#timeoutSignal() },
        );
        if (response.status !== 404) unwrapRestResponse(response);
      },
    });

    const webRoot = new URL(input.webBaseUrl);
    const totpSession = new GiteaWebSession(webRoot, this.#timeoutMs);
    await totpSession.login(totpUsername, totpPassword);
    const enrollment = await enrollTotp(totpSession);

    const callbackUrl = `http://pangit-e2e.invalid/oauth/callback?type=gitea`;
    const oauthPayload = unwrapRestResponse(
      await this.#client.userCreateOAuth2Application({
        body: {
          mediaType: "application/json",
          value: {
            name: `PanGit E2E ${suffix}`,
            redirect_uris: [callbackUrl],
            confidential_client: true,
            skip_secondary_authorization: false,
          },
        },
      }, { signal: this.#timeoutSignal() }),
    ) as {
      readonly id?: unknown;
      readonly client_id?: unknown;
      readonly client_secret?: unknown;
    };
    const applicationId = requiredInteger(oauthPayload.id, "OAuth application ID");
    const clientId = requiredString(oauthPayload.client_id, "OAuth client ID");
    const clientSecret = requiredString(oauthPayload.client_secret, "OAuth client secret");
    this.#cleanups.push({
      name: `OAuth application ${applicationId}`,
      run: async () => {
        const response = await this.#client.userDeleteOAuth2Application(
          { path: { id: applicationId } },
          { signal: this.#timeoutSignal() },
        );
        if (response.status !== 404) unwrapRestResponse(response);
      },
    });

    return Object.freeze({
      username: requiredString(input.username, "fixture username"),
      password: requiredString(input.password, "fixture password"),
      invalidSecret: `invalid-${crypto.randomUUID()}`,
      totp: Object.freeze({
        username: totpUsername,
        password: totpPassword,
        nextOneTimePassword: () => nextTotp(enrollment.secret, enrollment.counter),
      }),
      oauth: Object.freeze({
        clientId,
        clientSecret,
        callbackUrl,
        authorize: async (authorizationUrl: URL) => {
          const session = new GiteaWebSession(webRoot, this.#timeoutMs);
          await session.login(input.username, input.password);
          return await authorizeOAuth(session, authorizationUrl, callbackUrl);
        },
      }),
    });
  }

  async cleanup(): Promise<void> {
    if (this.#closed) return;
    this.#closed = true;
    const errors: string[] = [];
    for (const cleanup of this.#cleanups.toReversed()) {
      try {
        await cleanup.run();
      } catch (error) {
        errors.push(`${cleanup.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    this.#cleanups.length = 0;
    if (errors.length > 0) {
      throw new Error(`Gitea authentication fixture cleanup failed: ${errors.join("; ")}`);
    }
  }

  #timeoutSignal(): AbortSignal {
    return AbortSignal.timeout(this.#timeoutMs);
  }

  #requireOpen(): void {
    if (this.#closed) throw new Error("Gitea authentication fixture driver is already closed");
  }
}

class GiteaWebSession {
  readonly #cookies = new Map<string, string>();

  constructor(readonly root: URL, readonly timeoutMs: number) {}

  async login(username: string, password: string): Promise<void> {
    const page = await this.follow(new URL("/user/login", this.root));
    const form = parseForm(await page.text(), page.url, "/user/login");
    form.values.set("user_name", requiredString(username, "web username"));
    form.values.set("password", requiredString(password, "web password"));
    const response = await this.request(form.action, {
      method: "POST",
      body: form.values,
    });
    if (!isRedirect(response.status)) {
      throw new Error(`Gitea web login failed with HTTP ${response.status}`);
    }
  }

  async follow(url: URL, init: RequestInit = {}): Promise<Response> {
    let current = new URL(url);
    let method = init.method ?? "GET";
    let body = init.body;
    for (let redirects = 0; redirects <= 8; redirects++) {
      const response = await this.request(current, { ...init, method, body });
      if (!isRedirect(response.status)) return response;
      const location = response.headers.get("location");
      if (location === null) throw new Error("Gitea redirect omitted Location");
      current = new URL(location, current);
      method = "GET";
      body = undefined;
    }
    throw new Error("Gitea web flow exceeded its redirect limit");
  }

  async request(url: URL, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers);
    if (this.#cookies.size > 0) {
      headers.set(
        "Cookie",
        [...this.#cookies].map(([name, value]) => `${name}=${value}`).join("; "),
      );
    }
    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "manual",
      signal: init.signal ?? AbortSignal.timeout(this.timeoutMs),
    });
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(";", 1)[0];
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      if (value.length === 0 || /max-age=0/i.test(header)) this.#cookies.delete(name);
      else this.#cookies.set(name, value);
    }
    return response;
  }
}

async function enrollTotp(
  session: GiteaWebSession,
): Promise<{ readonly secret: string; readonly counter: number }> {
  const page = await session.follow(
    new URL("/user/settings/security/two_factor/enroll", session.root),
  );
  if (!page.ok) throw new Error(`Gitea TOTP enrollment page failed with HTTP ${page.status}`);
  const html = await page.text();
  const secretLabel = html.toLowerCase().indexOf("enter the secret");
  const secretText = decodeHtml(
    html.slice(Math.max(0, secretLabel), secretLabel < 0 ? undefined : secretLabel + 1_000)
      .replaceAll(/<[^>]*>/g, " "),
  );
  const secretMatch = secretText.match(/\b[A-Z2-7]{16,}\b/i);
  if (secretMatch === null) throw new Error("Gitea TOTP enrollment secret is missing");
  const secret = secretMatch[0].toUpperCase();
  const form = parseForm(html, page.url, "two_factor/enroll");
  const counter = Math.floor(Date.now() / 30_000);
  form.values.set("passcode", await totp(secret, counter));
  const response = await session.request(form.action, { method: "POST", body: form.values });
  if (!isRedirect(response.status)) {
    throw new Error(`Gitea TOTP enrollment failed with HTTP ${response.status}`);
  }
  return Object.freeze({ secret, counter });
}

async function authorizeOAuth(
  session: GiteaWebSession,
  authorizationUrl: URL,
  callbackUrl: string,
): Promise<string> {
  const grantPage = await session.follow(authorizationUrl);
  if (!grantPage.ok) throw new Error(`Gitea OAuth grant page failed with HTTP ${grantPage.status}`);
  const grant = parseForm(await grantPage.text(), grantPage.url, "/login/oauth/grant");
  grant.values.set("granted", "true");
  const response = await session.request(grant.action, { method: "POST", body: grant.values });
  if (!isRedirect(response.status)) {
    throw new Error(`Gitea OAuth grant failed with HTTP ${response.status}`);
  }
  const location = response.headers.get("location");
  if (location === null) throw new Error("Gitea OAuth grant omitted its callback redirect");
  const callback = new URL(location, grant.action);
  const expected = new URL(callbackUrl);
  if (callback.origin !== expected.origin || callback.pathname !== expected.pathname) {
    throw new Error("Gitea OAuth grant redirected to an unexpected callback");
  }
  return callback.href;
}

function parseForm(html: string, pageUrl: string, actionFragment: string): Form {
  for (const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const actionText = attribute(match[1], "action") ?? pageUrl;
    const action = new URL(decodeHtml(actionText), pageUrl);
    if (!action.pathname.includes(actionFragment)) continue;
    const values = new URLSearchParams();
    for (const input of match[2].matchAll(/<input\b([^>]*)>/gi)) {
      const name = attribute(input[1], "name");
      if (name === undefined) continue;
      values.set(decodeHtml(name), decodeHtml(attribute(input[1], "value") ?? ""));
    }
    return Object.freeze({ action, values });
  }
  throw new Error(`Gitea form ${actionFragment} is missing`);
}

function attribute(attributes: string, name: string): string | undefined {
  const quoted = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  if (quoted !== null) return quoted[2];
  return attributes.match(new RegExp(`\\b${name}\\s*=\\s*([^\\s>]+)`, "i"))?.[1];
}

function decodeHtml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#34;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

async function nextTotp(secret: string, enrolledCounter: number): Promise<string> {
  let counter = Math.floor(Date.now() / 30_000);
  if (counter <= enrolledCounter) {
    await new Promise((resolve) =>
      setTimeout(resolve, (enrolledCounter + 1) * 30_000 - Date.now())
    );
    counter = Math.floor(Date.now() / 30_000);
  }
  return await totp(secret, counter);
}

async function totp(secret: string, counter: number): Promise<string> {
  const key = Uint8Array.from(decodeBase32(secret)).buffer;
  const message = new Uint8Array(8);
  new DataView(message.buffer).setBigUint64(0, BigInt(counter));
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, message));
  const offset = digest[digest.length - 1] & 0x0f;
  const value = ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(value % 1_000_000).padStart(6, "0");
}

function decodeBase32(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replaceAll("=", "").toUpperCase()) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new TypeError("Invalid TOTP secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2);
  }
  return bytes;
}

function isRedirect(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Gitea ${label} is missing`);
  }
  return value;
}

function requiredInteger(value: unknown, label: string): number | bigint {
  if (typeof value === "bigint" && value >= 0n) return value;
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return value;
  throw new Error(`Gitea ${label} is missing`);
}
