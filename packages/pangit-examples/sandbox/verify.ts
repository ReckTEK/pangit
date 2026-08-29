import { authorizeWithToken } from "../main.ts";

const token = (await Deno.readTextFile("/sandbox-auth/gitea-token")).trim();
if (token.length === 0) throw new Error("Gitea did not create a personal access token");

const authorized = await authorizeWithToken(token);
if (authorized.provider !== "gitea" || authorized.version !== "1.27.2") {
  throw new Error("Gitea token authorization returned the wrong provider selection");
}

console.log("✓ PanGit authorized the unchanged example against Gitea 1.27.2");
