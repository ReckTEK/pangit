import { createClient, createCodebergClient } from "@recktek/pangit/api";

const gitea = await createClient("gitea", "1.27.2", "https://gitea.example.com");
const forgejo = await createClient("forgejo", "16.0.3", "https://forgejo.example.com");
const gitlab = await createClient("gitlab", "19.3.1", "https://gitlab.example.com");
const codeberg = await createCodebergClient("16.0.3");

// Each connection loads only its chosen provider; authenticate the one you use.
console.log(gitea.provider, forgejo.provider, gitlab.provider, codeberg.provider);
