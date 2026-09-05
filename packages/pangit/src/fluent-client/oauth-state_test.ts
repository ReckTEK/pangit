import { createOAuthLogin } from "../fluent-api/auth/oauth-login.ts";
import { createOAuthHandler } from "../fluent-api/auth/oauth-handler.ts";
import { OAuthCallbackError } from "../fluent-api/auth/OAuthCallbackError.ts";

Deno.test("OAuth login options cannot mutate the configured callback", async () => {
  const login = createOAuthLogin(
    "gitea",
    "1.27.2",
    {
      clientId: "client",
      callbackUrl: "https://app.invalid/callback",
    },
    (input) => Promise.resolve({ authorizationUrl: new URL(input.callbackUrl) }),
    () => Promise.reject(new Error("unused")),
    () => Promise.reject(new Error("unused")),
  );
  const callback = login.options.callbackUrl;
  if (callback instanceof URL) callback.hostname = "changed.invalid";
  const started = await login.start();
  if (new URL(started.transaction.callbackUrl).hostname !== "app.invalid") {
    throw new Error("Public options changed the configured OAuth callback");
  }
});

Deno.test("OAuth dispatch rejects inherited object names as unconfigured providers", async () => {
  const handler = createOAuthHandler({});
  for (const name of ["constructor", "toString", "__proto__"]) {
    try {
      await handler.start(name as never);
    } catch (error) {
      if (error instanceof OAuthCallbackError && error.code === "provider_not_configured") continue;
      throw new Error("Inherited object member was treated as a configured login", {
        cause: error,
      });
    }
    throw new Error("Unconfigured provider accepted");
  }
});
