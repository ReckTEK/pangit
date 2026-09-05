import type { GiteaProviderTypes } from "../fluent-providers/gitea/provider-types.ts";
import { giteaExtensions } from "../fluent-providers/gitea/extensions/runtime.ts";
import type { FluentClient } from "../fluent-api/client/FluentClient.ts";
import type { OAuthAuthorizedClient } from "../fluent-api/auth/oauth-contracts.ts";
import { createAuth } from "../fluent-api/auth/client-authentication.ts";
import { OAuthCallbackError } from "../fluent-api/auth/OAuthCallbackError.ts";

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
): Promise<void> {
  try {
    await execute();
  } catch (error) {
    assert(error instanceof errorType, `Expected ${errorType.name}, received ${String(error)}`);
    return;
  }
  throw new Error(`Expected ${errorType.name}`);
}

function fakeClient(): FluentClient<"gitea", "1.27.2", GiteaProviderTypes> {
  return Object.freeze({ provider: "gitea", version: "1.27.2" }) as FluentClient<
    "gitea",
    "1.27.2",
    GiteaProviderTypes
  >;
}

Deno.test("universal Basic operation invokes the Gitea branch at most once", async () => {
  let branchCalls = 0;
  const authorizedInputs: unknown[] = [];
  const auth = createAuth<"gitea", "1.27.2", GiteaProviderTypes>(
    "gitea",
    "1.27.2",
    giteaExtensions,
    {
      token: () => Promise.resolve(fakeClient()),
      basic: (input, options) => {
        authorizedInputs.push({ input, options });
        return Promise.resolve(fakeClient());
      },
      beginOAuth: () => Promise.reject(new Error("unused")),
      exchangeOAuthCode: () => Promise.reject(new Error("unused")),
      oauth: () => Promise.reject(new Error("unused")),
    },
  );
  const operation = auth.basic({ username: "user", password: "password" }).gitea(() => {
    branchCalls++;
    return { oneTimePassword: "123456" };
  });
  await operation.authorize();
  assertEquals(branchCalls, 1, "Basic extension callback count changed");
  assertEquals(authorizedInputs, [{
    input: {
      username: "user",
      password: "password",
    },
    options: { extension: { oneTimePassword: "123456" } },
  }], "Basic extension did not stay operation-specific");
});

Deno.test("universal OAuth owns state, PKCE, transaction, and callback validation", async () => {
  const beginInputs: unknown[] = [];
  const exchangeInputs: unknown[] = [];
  const auth = createAuth<"gitea", "1.27.2", GiteaProviderTypes>(
    "gitea",
    "1.27.2",
    giteaExtensions,
    {
      token: () => Promise.resolve(fakeClient()),
      basic: () => Promise.resolve(fakeClient()),
      beginOAuth: (input) => {
        beginInputs.push(input);
        return Promise.resolve({
          authorizationUrl: new URL(`https://gitea.example.invalid/oauth?state=${input.state}`),
        });
      },
      exchangeOAuthCode: (input) => {
        exchangeInputs.push(input);
        return Promise.resolve({ accessToken: "access", tokenType: "Bearer" });
      },
      oauth: (_token, authorization) =>
        Promise.resolve(Object.freeze({
          ...fakeClient(),
          authorization,
        }) as OAuthAuthorizedClient<"gitea", "1.27.2", GiteaProviderTypes>),
    },
  );
  const login = auth.login({
    clientId: "client-id",
    callbackUrl: "https://app.example.invalid/callback?keep=yes",
    scopes: ["repo"],
  });
  const start = await login.start();
  assert(start.transaction.state.length >= 40, "OAuth state is not high entropy");
  assert(start.transaction.codeVerifier.length >= 40, "OAuth verifier is not high entropy");
  const begin = beginInputs[0] as {
    state: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    callbackUrl: URL;
  };
  assertEquals(begin.state, start.transaction.state, "OAuth state ownership changed");
  assert(begin.codeChallenge !== start.transaction.codeVerifier, "PKCE challenge leaked verifier");
  assertEquals(begin.codeChallengeMethod, "S256", "PKCE method changed");
  assertEquals(
    begin.callbackUrl.href,
    "https://app.example.invalid/callback?keep=yes&type=gitea",
    "provider callback discriminator changed",
  );

  for (
    const request of [
      new Request(
        `${start.transaction.callbackUrl}&state=wrong&code=code`,
      ),
      new Request(
        `https://wrong.example.invalid/callback?keep=yes&type=gitea&state=${start.transaction.state}&code=code`,
      ),
    ]
  ) {
    await assertRejects(() => login.authorize(request, start.transaction), OAuthCallbackError);
  }
  assertEquals(exchangeInputs.length, 0, "invalid callback reached token exchange");

  const callback = new Request(
    `${start.transaction.callbackUrl}&state=${start.transaction.state}&code=authorization-code`,
  );
  const authorized = await login.authorize(callback, start.transaction);
  assertEquals(exchangeInputs.length, 1, "valid callback exchange count changed");
  const exchange = exchangeInputs[0] as { code: string; codeVerifier: string };
  assertEquals(exchange.code, "authorization-code", "OAuth code changed");
  assertEquals(exchange.codeVerifier, start.transaction.codeVerifier, "OAuth verifier changed");
  assertEquals(authorized.authorization, {
    method: "oauth",
    accessToken: "access",
    tokenType: "Bearer",
  }, "OAuth authorization metadata changed");
});
