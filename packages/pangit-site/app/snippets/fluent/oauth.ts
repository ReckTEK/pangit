import { auth, createClient } from "@recktek/pangit/api";

const clientId = Deno.env.get("OAUTH_CLIENT_ID");
const clientSecret = Deno.env.get("OAUTH_CLIENT_SECRET");
const cookieSecret = Deno.env.get("OAUTH_COOKIE_SECRET");
if (!clientId || !clientSecret || !cookieSecret) {
  throw new Error("Set the OAuth client ID, client secret, and a stable cookie secret.");
}

const connection = await createClient("gitea", "1.27.2", "https://git.example.com");
const oauth = auth.createOAuthHandler({
  gitea: connection.auth.login({
    clientId,
    clientSecret,
    callbackUrl: "https://app.example.com/auth/callback",
    scopes: ["read:user", "read:repository"],
  }),
});
const flow = auth.createOAuthCookieFlow(oauth, {
  cookie: { secret: cookieSecret }, // At least 32 bytes; retain across requests.
});

export async function handleLogin(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (path === "/auth/login") return await flow.start("gitea");
  if (path === "/auth/callback") {
    const result = await flow.complete(request);
    if (!result.ok) {
      return new Response("Login failed", { status: 401, headers: result.headers });
    }
    // Create your application's session here using result.authorized.
    // Propagate result.headers to clear the short-lived transaction cookie.
    return new Response("Provider authorization complete", { headers: result.headers });
  }
  return new Response("Not found", { status: 404 });
}
