import { loadRestClient } from "@mannsion/pangit";

const gitea = await loadRestClient("gitea", "1.27.2", {
  baseUrl: "https://git.example.com/api/v1",
});

const response = await gitea.getVersion();
console.log(response);
