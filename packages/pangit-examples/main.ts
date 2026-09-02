import * as PanGit from "@mannsion/pangit";

const apiUrl = Deno.env.get("PANGIT_GITEA_API_URL")?.trim();
const token = Deno.env.get("PANGIT_GITEA_PAT")?.trim();

if (!apiUrl || !token) {
  throw new Error("PanGit example configuration is incomplete");
}

const client = await PanGit.createProviderClient("gitea", "1.27.2", {
  baseUrl: apiUrl,
  headers: { Authorization: `token ${token}` },
});

const response = await client.userGetCurrent();
if (!response.documented || !response.ok) {
  throw new Error(`Gitea returned ${response.status}`);
}

console.log(response.body.login);
