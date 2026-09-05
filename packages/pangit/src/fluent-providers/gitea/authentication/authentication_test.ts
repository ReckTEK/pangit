import {
  AuthenticationError,
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  authorizeGiteaBasic,
  authorizeGiteaToken,
  beginGiteaOAuth,
  exchangeGiteaOAuthCode,
} from "./mod.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
  }
}

async function assertRejects(
  execute: () => unknown | Promise<unknown>,
  errorType: new (...args: never[]) => Error,
): Promise<Error> {
  try {
    await execute();
  } catch (error) {
    assert(error instanceof errorType, `Expected ${errorType.name}, received ${String(error)}`);
    return error;
  }
  throw new Error(`Expected ${errorType.name}`);
}

function userResponse(status = 200): Response {
  return new Response(
    status === 200 ? JSON.stringify({ id: 7, login: "fixture-user" }) : JSON.stringify({}),
    { status, headers: { "content-type": "application/json" } },
  );
}

Deno.test("Gitea PAT authorization performs one direct verification with the token scheme", async () => {
  const requests: Request[] = [];
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: (input, init) => {
      const request = new Request(input, init);
      requests.push(request);
      return Promise.resolve(userResponse());
    },
  });
  const authorized = await authorizeGiteaToken(context, { token: "secret-token" });
  assertEquals(requests.length, 1, "PAT authorization made an unexpected request count");
  assert(requests[0].url.endsWith("/api/v1/user"), "PAT verification did not use current user");
  assertEquals(
    requests[0].headers.get("authorization"),
    "token secret-token",
    "PAT authorization header changed",
  );
  assertEquals(authorized.currentUser()?.login, "fixture-user", "verified identity was not cached");
});

Deno.test("Gitea Basic authorization is UTF-8 safe and carries the optional OTP once", async () => {
  const requests: Request[] = [];
  const context = new GiteaAdapterContext("1.26.4", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: (input, init) => {
      requests.push(new Request(input, init));
      return Promise.resolve(userResponse());
    },
  });
  await authorizeGiteaBasic(context, {
    username: "üser",
    password: "päss",
  }, { extension: { oneTimePassword: "123456" } });
  assertEquals(requests.length, 1, "Basic authorization made an unexpected request count");
  assertEquals(requests[0].headers.get("x-gitea-otp"), "123456", "OTP header changed");
  const encoded = requests[0].headers.get("authorization")?.replace(/^Basic /, "");
  assert(encoded !== undefined, "Basic authorization header is missing");
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  assertEquals(new TextDecoder().decode(bytes), "üser:päss", "Basic credentials were not UTF-8");
});

Deno.test("Gitea authorization validates credentials before any request and does not leak secrets", async () => {
  let requests = 0;
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: () => {
      requests++;
      return Promise.resolve(userResponse(401));
    },
  });
  for (
    const [operation, execute] of [
      ["authorizeToken", () => authorizeGiteaToken(context, { token: "   " })],
      [
        "authorizeToken",
        () => authorizeGiteaToken(context, { token: "secret", tokenType: "not a scheme" }),
      ],
      [
        "authorizeBasic",
        () => authorizeGiteaBasic(context, { username: "a:b", password: "secret" }),
      ],
      ["authorizeBasic", () => authorizeGiteaBasic(context, { username: "user", password: "" })],
      ["authorizeBasic", () =>
        authorizeGiteaBasic(context, {
          username: "user",
          password: "secret",
        }, { extension: { oneTimePassword: " " } })],
    ] as const
  ) {
    const error = await assertRejects(execute, ValidationError) as ValidationError;
    assertEquals(error.operation, operation, "authorization validation operation changed");
    assertEquals(error.provider, "gitea", "authorization validation provider changed");
    assertEquals(error.version, "1.27.2", "authorization validation version changed");
  }
  assertEquals(requests, 0, "invalid local credentials reached the provider");

  const error = await assertRejects(
    () => authorizeGiteaToken(context, { token: "do-not-leak-this" }),
    AuthenticationError,
  );
  assert(!String(error).includes("do-not-leak-this"), "credential leaked through error text");
  assertEquals(requests, 1, "invalid PAT verification request count changed");
});

Deno.test("Gitea OAuth begin creates the provider URL locally", () => {
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://git.example.invalid/custom/api/v1",
    webBaseUrl: "https://login.example.invalid/gitea/",
  });
  const result = beginGiteaOAuth(context, {
    clientId: "client-id",
    callbackUrl: new URL("https://app.example.invalid/oauth?type=gitea"),
    scopes: ["read:user", "repo"],
    state: "state-value",
    codeChallenge: "challenge-value",
    codeChallengeMethod: "S256",
  });
  assertEquals(
    result.authorizationUrl.origin,
    "https://login.example.invalid",
    "OAuth host changed",
  );
  assertEquals(
    result.authorizationUrl.pathname,
    "/gitea/login/oauth/authorize",
    "OAuth path changed",
  );
  assertEquals(
    Object.fromEntries(result.authorizationUrl.searchParams),
    {
      client_id: "client-id",
      redirect_uri: "https://app.example.invalid/oauth?type=gitea",
      response_type: "code",
      state: "state-value",
      code_challenge_method: "S256",
      code_challenge: "challenge-value",
      scope: "read:user repo",
    },
    "OAuth query changed",
  );
});

Deno.test("Gitea OAuth exchange sends one sanitized form request and normalizes metadata", async () => {
  const requests: Request[] = [];
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1?unsafe=default",
    headers: { "x-unsafe-default": "must-not-forward" },
    fetch: (input, init) => {
      requests.push(new Request(input, init));
      return Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: "oauth-access",
            token_type: "Bearer",
            expires_in: "3600",
            refresh_token: "oauth-refresh",
            scope: "repo",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    },
  });
  const token = await exchangeGiteaOAuthCode(context, {
    clientId: "client-id",
    clientSecret: "client-secret",
    callbackUrl: new URL("https://app.example.invalid/oauth?type=gitea"),
    code: "authorization-code",
    codeVerifier: "verifier",
  });
  assertEquals(requests.length, 1, "OAuth exchange made an unexpected request count");
  assertEquals(
    requests[0].url,
    "https://gitea.example.invalid/login/oauth/access_token",
    "OAuth exchange inherited the API path or query",
  );
  assertEquals(
    requests[0].headers.get("x-unsafe-default"),
    null,
    "OAuth exchange forwarded an API default header",
  );
  assertEquals(
    requests[0].headers.get("content-type"),
    "application/x-www-form-urlencoded",
    "OAuth exchange media type changed",
  );
  assertEquals(
    Object.fromEntries(new URLSearchParams(await requests[0].text())),
    {
      client_id: "client-id",
      code: "authorization-code",
      grant_type: "authorization_code",
      redirect_uri: "https://app.example.invalid/oauth?type=gitea",
      code_verifier: "verifier",
      client_secret: "client-secret",
    },
    "OAuth exchange form changed",
  );
  assertEquals(token, {
    accessToken: "oauth-access",
    tokenType: "Bearer",
    expiresIn: 3600,
    refreshToken: "oauth-refresh",
    scope: "repo",
  }, "OAuth token normalization changed");
});

Deno.test("Gitea OAuth exchange rejects malformed success payloads", async () => {
  const context = new GiteaAdapterContext("1.27.2", {
    baseUrl: "https://gitea.example.invalid/api/v1",
    fetch: () => Promise.resolve(Response.json({ token_type: "Bearer" })),
  });
  await assertRejects(
    () =>
      exchangeGiteaOAuthCode(context, {
        clientId: "client-id",
        callbackUrl: new URL("https://app.example.invalid/oauth?type=gitea"),
        code: "authorization-code",
        codeVerifier: "verifier",
      }),
    ProviderInvariantError,
  );
});
