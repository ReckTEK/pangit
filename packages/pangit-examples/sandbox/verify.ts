import * as PanGit from "@mannsion/pangit";

const token = (await Deno.readTextFile("/sandbox-auth/gitea-token")).trim();
if (token.length === 0) throw new Error("Gitea did not create a personal access token");

const client = await PanGit.api.createClient(
  "gitea",
  "1.27.2",
  "http://127.0.0.1:3300/api/v1",
);
const authorized = await client.auth.token(token);
if (authorized.provider !== "gitea" || authorized.version !== "1.27.2") {
  throw new Error("Gitea token authorization returned the wrong provider selection");
}

console.log("✓ PanGit authorized the unchanged example against Gitea 1.27.2");
