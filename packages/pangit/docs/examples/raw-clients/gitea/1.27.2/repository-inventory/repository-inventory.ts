/** Read-only inventory of repositories accessible to the authenticated account. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, paginate, printJson } from "./client.ts";

const client = await createClient();
const user = unwrapRestResponse(await client.userGetCurrent());
const repositories = [];

for await (
  const repository of paginate(async (page, limit) =>
    unwrapRestResponse(await client.userCurrentListRepos({ query: { page, limit } }))
  )
) {
  repositories.push({
    id: repository.id,
    name: repository.full_name,
    private: repository.private,
    archived: repository.archived,
    default_branch: repository.default_branch,
    open_issues: repository.open_issues_count,
    clone_url: repository.clone_url,
    ssh_url: repository.ssh_url,
    web_url: repository.html_url,
  });
}

printJson({ account: user.login, count: repositories.length, repositories });
