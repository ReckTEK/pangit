import * as PanGit from "@mannsion/pangit";

const pangit = PanGit.api.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});

export async function authorizeWithToken(
  token: string,
): Promise<PanGit.api.AuthorizedClient<"gitea", "1.27.2">> {
  const authorized = await pangit.auth.token({ token });

  // Later: authorized.repositories.list(...)
  return authorized;
}

export async function authorizeWithBasic(
  username: string,
  password: string,
): Promise<PanGit.api.AuthorizedClient<"gitea", "1.27.2">> {
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
): PanGit.api.auth.Login<"gitea", "1.27.2"> {
  return pangit.auth.login({
    clientId,
    callbackUrl,
  });
}
