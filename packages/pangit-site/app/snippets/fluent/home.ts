import { createClient } from "@recktek/pangit/api";

const git = await createClient(
  "forgejo",
  "16.0.3",
  "https://git.example.com",
);

const owner = await git.container("acme");
const repo = await owner.repository("website");
const readme = await repo.content.readText("README.md");

console.log(readme);
