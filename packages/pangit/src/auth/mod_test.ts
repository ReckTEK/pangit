import { PanGit } from "../client/mod.ts";

Deno.test("Gitea token authorization verifies the token with the selected raw client", async () => {
  let captured: Request | undefined;
  const selected = PanGit.createClient("gitea", "1.27.2", {
    baseUrl: "https://gitea.test/api/v1",
    fetch: (request) => {
      captured = request instanceof Request ? request : new Request(request);
      return Promise.resolve(
        new Response('{"id":1,"login":"sandbox"}', {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      );
    },
  });

  const authorized = await selected.auth.token({ token: "gitea-token" });

  assert(captured !== undefined, "Gitea current-user verification did not make a request");
  assertEquals(captured.url, "https://gitea.test/api/v1/user");
  assertEquals(captured.method, "GET");
  assertEquals(captured.headers.get("authorization"), "token gitea-token");
  assertEquals(authorized.provider, "gitea");
  assertEquals(authorized.version, "1.27.2");
});

Deno.test("Gitea token authorization reports a clear non-success error", async () => {
  const selected = PanGit.createClient("gitea", "1.27.2", {
    baseUrl: "https://gitea.test/api/v1",
    fetch: () =>
      Promise.resolve(
        new Response('{"message":"unauthorized"}', {
          status: 401,
          headers: { "content-type": "application/json" },
        }),
      ),
  });

  let thrown: unknown;
  try {
    await selected.auth.token({ token: "must-not-leak" });
  } catch (error) {
    thrown = error;
  }

  assert(thrown instanceof Error, "Gitea token authorization did not reject");
  assertEquals(
    thrown.message,
    "Gitea token authorization failed: GET /user returned HTTP 401",
  );
  assert(!thrown.message.includes("must-not-leak"), "Authorization error leaked the token");
});

Deno.test("Gitea OAuth login builds PKCE and authorizes one native callback request", async () => {
  const requests: Request[] = [];
  const selected = PanGit.createClient("gitea", "1.27.2", {
    baseUrl: "https://gitea.test/team/api/v1",
    fetch: (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      if (request.url === "https://gitea.test/team/login/oauth/access_token") {
        return Promise.resolve(
          Response.json({
            access_token: "oauth-access-token",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: "oauth-refresh-token",
            scope: "read:user",
          }),
        );
      }
      if (request.url === "https://gitea.test/team/api/v1/user") {
        return Promise.resolve(Response.json({ id: 1, login: "sandbox" }));
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    },
  });
  const oauth = PanGit.createOAuthHandler({
    gitea: selected.auth.login({
      clientId: "gitea-client-id",
      callbackUrl: "https://app.test/auth/callback",
      scopes: ["read:user"],
    }),
  });

  const start = await oauth.start("gitea");
  assertEquals(start.url.origin, "https://gitea.test");
  assertEquals(start.url.pathname, "/team/login/oauth/authorize");
  assertEquals(start.url.searchParams.get("client_id"), "gitea-client-id");
  assertEquals(start.url.searchParams.get("response_type"), "code");
  assertEquals(start.url.searchParams.get("scope"), "read:user");
  assertEquals(start.url.searchParams.get("code_challenge_method"), "S256");
  assertEquals(start.url.searchParams.get("state"), start.transaction.state);
  assertEquals(
    start.url.searchParams.get("redirect_uri"),
    "https://app.test/auth/callback?type=gitea",
  );
  assertEquals(
    start.url.searchParams.get("code_challenge"),
    await sha256Base64Url(start.transaction.codeVerifier),
  );

  const callback = new URL(start.transaction.callbackUrl);
  callback.searchParams.set("code", "one-time-code");
  callback.searchParams.set("state", start.transaction.state);
  const authorized = await oauth.authorize(new Request(callback), start.transaction);

  assertEquals(authorized.provider, "gitea");
  assertEquals(authorized.version, "1.27.2");
  assertEquals(authorized.authorization.method, "oauth");
  assertEquals(authorized.authorization.accessToken, "oauth-access-token");
  assertEquals(authorized.authorization.tokenType, "Bearer");
  assertEquals(authorized.authorization.expiresIn, 3600);
  assertEquals(authorized.authorization.refreshToken, "oauth-refresh-token");
  assertEquals(authorized.authorization.scope, "read:user");

  assertEquals(requests.length, 2);
  const exchange = requests[0];
  assertEquals(exchange.method, "POST");
  const exchangeBody = new URLSearchParams(await exchange.text());
  assertEquals(exchangeBody.get("client_id"), "gitea-client-id");
  assertEquals(exchangeBody.get("code"), "one-time-code");
  assertEquals(exchangeBody.get("code_verifier"), start.transaction.codeVerifier);
  assertEquals(exchangeBody.get("redirect_uri"), start.transaction.callbackUrl);
  assertEquals(requests[1].headers.get("authorization"), "Bearer oauth-access-token");
});

Deno.test("OAuth callback rejects a mismatched state before exchanging a code", async () => {
  let fetchCalls = 0;
  const selected = PanGit.createClient("gitea", "1.27.2", {
    baseUrl: "https://gitea.test/api/v1",
    fetch: () => {
      fetchCalls += 1;
      return Promise.resolve(new Response(null, { status: 500 }));
    },
  });
  const oauth = PanGit.createOAuthHandler({
    gitea: selected.auth.login({
      clientId: "gitea-client-id",
      callbackUrl: "https://app.test/auth/callback",
    }),
  });
  const start = await oauth.start("gitea");
  const callback = new URL(start.transaction.callbackUrl);
  callback.searchParams.set("code", "one-time-code");
  callback.searchParams.set("state", "wrong-state");

  let thrown: unknown;
  try {
    await oauth.authorize(new Request(callback), start.transaction);
  } catch (error) {
    thrown = error;
  }

  assert(thrown instanceof Error, "OAuth state mismatch did not reject");
  assertEquals(thrown.message, "OAuth callback state does not match");
  assertEquals(fetchCalls, 0);
});

Deno.test("Gitea OAuth invokes the browser global Fetch with its required receiver", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (this !== globalThis) throw new TypeError("Illegal invocation");
    const request = new Request(input, init);
    calls += 1;
    if (request.url.endsWith("/login/oauth/access_token")) {
      return Promise.resolve(Response.json({ access_token: "token", token_type: "Bearer" }));
    }
    return Promise.resolve(Response.json({ id: 1, login: "sandbox" }));
  };

  try {
    const selected = PanGit.createClient("gitea", "1.27.2", {
      baseUrl: "https://gitea.test/api/v1",
    });
    const oauth = PanGit.createOAuthHandler({
      gitea: selected.auth.login({
        clientId: "gitea-client-id",
        callbackUrl: "https://app.test/auth/callback",
      }),
    });
    const start = await oauth.start("gitea");
    const callback = new URL(start.transaction.callbackUrl);
    callback.searchParams.set("code", "one-time-code");
    callback.searchParams.set("state", start.transaction.state);

    await oauth.authorize(new Request(callback), start.transaction);
    assertEquals(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (!Object.is(actual, expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
  );
  let binary = "";
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
