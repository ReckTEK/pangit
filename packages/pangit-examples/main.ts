import { type AuthorizedClient, type Login, PanGit } from "@mannsion/pangit";

const pangit = PanGit.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});

export async function authorizeWithToken(
  token: string,
): Promise<AuthorizedClient<"gitea", "1.27.2">> {
  const authorized = await pangit.auth.token({ token });

  // Later: authorized.repositories.list(...)
  return authorized;
}

export async function authorizeWithBasic(
  username: string,
  password: string,
): Promise<AuthorizedClient<"gitea", "1.27.2">> {
  return await pangit.auth
    .basic()
    .gitea(() => ({ username, password }))
    .codeberg(() => ({ username, password }))
    .bitbucket(() => ({ username, appPassword: password }))
    .authorize();
}

export function createLogin(
  clientId = "pangit-example",
  callbackUrl = "https://example.com/auth/callback",
): Login<"gitea", "1.27.2"> {
  return pangit.auth.login({
    clientId,
    callbackUrl,
  });
}
