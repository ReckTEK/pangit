import * as PanGit from "@recktek/pangit";

export const GITEA_API_URL = "http://127.0.0.1:3300/api/v1";
export const GITEA_VERSION = "1.27.2";

export interface ExampleOAuthOptions {
  readonly callbackUrl: string | URL;
  readonly clientId: string;
}

/** Build the shared example OAuth handler without starting a server or reading environment state. */
export async function createExampleOAuth(options: ExampleOAuthOptions) {
  if (options.clientId.length === 0) {
    throw new TypeError("Gitea OAuth client ID cannot be empty");
  }

  const selected = await PanGit.api.createClient("gitea", GITEA_VERSION, {
    baseUrl: GITEA_API_URL,
  });
  return PanGit.api.auth.createOAuthHandler({
    gitea: selected.auth.login({
      clientId: options.clientId,
      callbackUrl: options.callbackUrl,
      scopes: ["read:user"],
    }),
  });
}
