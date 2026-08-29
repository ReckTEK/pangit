export function giteaClientId(): string {
  const value = Deno.env.get("PANGIT_GITEA_CLIENT_ID")?.trim();
  if (!value) throw new Error("PANGIT_GITEA_CLIENT_ID is required");
  return value;
}

export function callbackUrl(request: Request): URL {
  return new URL("/auth/callback", request.url);
}
