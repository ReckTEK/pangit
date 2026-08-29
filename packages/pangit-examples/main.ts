import { PanGit } from "@mannsion/pangit";

const pangit = PanGit.createClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});

export async function authorizeWithToken(token: string) {
  const authorized = await pangit.auth.token({ token });

  // Later: authorized.repositories.list(...)
  return authorized;
}

export async function authorizeWithBasic(username: string, password: string) {
  return await pangit.auth
    .basic()
    .gitea(() => ({ username, password }))
    .codeberg(() => ({ username, password }))
    .bitbucket(() => ({ username, appPassword: password }))
    .authorize();
}

export function createLogin() {
  const login = pangit.auth.login({
    clientId: "pangit-example",
    callbackUrl: "https://example.com/auth/callback?type=gitea",
  });

  return {
    start: () => login.start(),
    authorize: (callback: Request) => login.authorize(callback),
  };
}
