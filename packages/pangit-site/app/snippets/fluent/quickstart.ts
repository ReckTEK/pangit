import { createClient } from "@recktek/pangit/api";

const token = Deno.env.get("GIT_TOKEN");
if (!token) throw new Error("Set GIT_TOKEN before running this example.");

const connection = await createClient("gitea", "1.27.2", "https://git.example.com");
const git = await connection.auth.token(token);
const owner = await git.container("acme");
const repo = await owner.repository("website");

const readme = await repo.content.readText("README.md", { ref: "main" });
console.log(readme);
