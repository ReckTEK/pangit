# Inventory your repositories

[All examples](../../../../examples.md) ·
[Previous: Create a private repository](../repository-setup/repository-setup.md) ·
[Next: Submit content through a pull request](../content-pull-requests/content-pull-requests.md)

**Raw REST clients · Gitea 1.27.2 · Lesson 3 of 8**

Build an inventory of projects to audit or feed into a separate backup job. You will read every page
of repositories accessible to the authenticated account and collect their clone URLs and visibility.

**Before you start:** complete [client setup](../getting-started/getting-started.md). This lesson
needs only `GITEA_API_URL` and `GITEA_TOKEN`; `GITEA_OWNER` and `GITEA_REPO` are not used.

**Writes:** none. This lists accessible repositories, including ones you may not own; it is not a
server-wide admin inventory or a backup of their contents.

## 1. Identify the account

Save the TypeScript blocks below, in order, as [`repository-inventory.ts`](repository-inventory.ts)
**beside `client.ts` in your own Deno project**.

Fetch the account once so the report identifies whose repository access it represents.

```ts
/** Read-only inventory of repositories accessible to the authenticated account. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, paginate, printJson } from "./client.ts";

const client = await createClient();
const user = unwrapRestResponse(await client.userGetCurrent());
const repositories = [];
```

## 2. Walk every page

`userCurrentListRepos` takes pagination in `query`. Unwrap each response before handing its items to
`paginate`, then select the fields useful for an inventory.

```ts
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
```

The helper continues even when a page has fewer than 50 entries. It finishes only when the endpoint
returns an empty page.

## 3. Print the report

```ts
printJson({ account: user.login, count: repositories.length, repositories });
```

## Run it

```bash
deno run --allow-env --allow-net repository-inventory.ts
```

To save the result, append `> inventory.json` to the command. Only stdout is redirected, so command
failures remain visible on stderr.

## Check the result

The JSON contains `account`, `count`, and a `repositories` array. If you completed repository setup,
find `your-user/client-examples` in that array with `private: true` and `default_branch: "main"`.
Clone URLs are reported but no clone is performed.

**Running again:** no server state changes; the inventory reflects the account's access at the time
of each request.

Next, use the repository's Contents API to submit a local document for review.

[All examples](../../../../examples.md) ·
[Previous: Create a private repository](../repository-setup/repository-setup.md) ·
[Next: Submit content through a pull request](../content-pull-requests/content-pull-requests.md)
