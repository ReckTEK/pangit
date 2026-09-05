import type * as api from "@recktek/pangit/api";
import type { MethodDescriptions } from "../mod.ts";

export const authentication = {
  title: "connection.auth",
  source: "fluent-api/auth/authentication-contracts.ts",
  methods: {
    "token":
      "token(token, options?) \u2192 FluentClient. Verify the token and return a new authorized client. Blank tokens are rejected locally.",
    "basic":
      "basic({ username, password }) \u2192 BasicAuthorization. Optionally configure a provider extension, then call authorize({ signal? }). Supported by Gitea and Forgejo.",
    "login":
      "login({ clientId, clientSecret?, callbackUrl, scopes? }) \u2192 Login. Configure OAuth without starting a redirect.",
  } satisfies MethodDescriptions<api.auth.Auth<"gitea", "1.27.2">>,
};

export const login = {
  title: "login",
  source: "fluent-api/auth/oauth-contracts.ts",
  methods: {
    "start":
      "start() \u2192 { url, transaction }. Redirect to url and retain transaction securely until the callback.",
    "authorize":
      "authorize(callbackRequest, transaction) \u2192 OAuthAuthorizedClient. Validate the callback and exchange its code. The returned client also has authorization token metadata.",
  } satisfies MethodDescriptions<api.auth.Login<"gitea", "1.27.2">>,
};

export const handler = {
  title: "oauth handler",
  source: "fluent-api/auth/oauth-contracts.ts",
  methods: {
    "start":
      "start(provider) \u2192 { url, transaction }. Start a login configured in createOAuthHandler({ provider: login }).",
    "authorize":
      "authorize(callbackRequest, transaction) \u2192 OAuthAuthorizedClient. Dispatch the callback to the transaction\u2019s selected provider.",
  } satisfies MethodDescriptions<api.auth.OAuthHandler<"gitea">>,
};

export const flow = {
  title: "cookie flow",
  source: "fluent-api/auth/oauth-cookie-flow.ts",
  methods: {
    "start":
      "start(provider) \u2192 Response. Return a redirect with an encrypted transaction cookie.",
    "complete":
      "complete(request) \u2192 { ok, authorized | error, headers }. Complete authorization and return headers that clear the transaction cookie on success or failure.",
  } satisfies MethodDescriptions<api.auth.OAuthCookieFlow<"gitea">>,
};

export const cookie = {
  title: "transaction cookie",
  source: "fluent-api/auth/oauth-transaction-cookie/contracts.ts",
  methods: {
    "set":
      "set(transaction) \u2192 string. Encrypt transaction state and return a Set-Cookie header value.",
    "read":
      "read(request) \u2192 transaction | undefined. Read and validate the cookie; invalid or expired state throws OAuthCallbackError.",
    "clear":
      "clear(request) \u2192 string. Return the Set-Cookie header value that expires the transaction cookie.",
  } satisfies MethodDescriptions<api.auth.OAuthTransactionCookie<"gitea">>,
};
