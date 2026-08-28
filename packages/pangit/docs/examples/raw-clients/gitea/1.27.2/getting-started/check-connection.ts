import { loadRestClient, unwrapRestResponse } from "@mannsion/pangit";

const baseUrl = Deno.env.get("GITEA_API_URL");
const token = Deno.env.get("GITEA_TOKEN");
if (!baseUrl || !token) throw new Error("Set GITEA_API_URL and GITEA_TOKEN.");

const client = await loadRestClient("gitea", "1.27.2", {
  baseUrl,
  headers: { Authorization: `token ${token}` },
});

const result = await client.userGetCurrent();
const user = unwrapRestResponse(result);
console.log({ status: result.status, login: user.login });
