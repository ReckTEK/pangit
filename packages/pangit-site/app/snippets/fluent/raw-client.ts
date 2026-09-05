import { createProviderClient } from "@recktek/pangit";

const token = Deno.env.get("GIT_TOKEN");
if (!token) throw new Error("Set GIT_TOKEN before running this example.");
const gitea = await createProviderClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
  headers: { Authorization: `token ${token}` },
});

const response = await gitea.repoGet({ path: { owner: "acme", repo: "website" } });
if (response.documented && response.ok) {
  console.log(response.body.full_name);
} else {
  console.error("Request failed or returned an undocumented status:", response.status);
}
