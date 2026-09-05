import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
const response = await repo.native.gitea(({ client, repository }) => {
  console.log(repository.id); // Original, version-typed Gitea payload.
  return client.repoGet({ path: { owner: repo.owner, repo: repo.name } });
});
if (response.documented && response.ok) {
  console.log(response.body.html_url);
}
