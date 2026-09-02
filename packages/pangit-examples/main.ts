import * as PanGit from "@mannsion/pangit";

const apiUrl = Deno.env.get("PANGIT_GITEA_API_URL")?.trim();
const token = Deno.env.get("PANGIT_GITEA_PAT")?.trim();
const containerName = Deno.env.get("PANGIT_GITEA_CONTAINER")?.trim();
const repositoryName = Deno.env.get("PANGIT_GITEA_REPOSITORY")?.trim();

if (!apiUrl || !token || !containerName || !repositoryName) {
  throw new Error("PanGit example configuration is incomplete");
}

const client = PanGit.api.createClient("gitea", "1.27.2", apiUrl);
const git = await client.auth.token(token);
const container = await git.container(containerName);
const existingRepository = await container.findRepository(repositoryName);
const repository = existingRepository ?? await container.createRepository(repositoryName, {
  initialize: true,
  defaultBranch: "main",
});

console.log(repository.url ?? repository.fullName);
