# Create a private repository

[All examples](../../../../examples.md) ·
[Previous: Set up the raw client](../getting-started/getting-started.md) ·
[Next: Inventory your repositories](../repository-inventory/repository-inventory.md)

**Raw REST clients · Gitea 1.27.2 · Lesson 2 of 8**

Give a new personal project a consistent starting point: a private repository with a README on
`main`, three labels, a first-release milestone, and a planning issue.

**Before you start:** complete [client setup](../getting-started/getting-started.md). Your account
must be allowed to create repositories and manage their issues. Choose an unused repository name.

**Writes:** one repository, three labels, one milestone, and one issue. This lesson creates a
personal repository under the authenticated account; it does not use `GITEA_OWNER` to choose another
owner.

## 1. Choose the project and identify its owner

```bash
export GITEA_REPO='client-examples'
```

Save the TypeScript blocks below, in order, as [`bootstrap-repository.ts`](bootstrap-repository.ts)
**beside `client.ts` in your own Deno project**.

Resolve the token's account before creating anything. Its login becomes the owner used by subsequent
requests.

```ts
/** Start a personal project with a private repo, labels, a milestone, and a planning issue. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, printJson, required } from "./client.ts";

const name = env("GITEA_REPO");
const client = await createClient();
const user = unwrapRestResponse(await client.userGetCurrent());
const path = { owner: required(user.login, "user.login"), repo: name };
```

## 2. Initialize a private repository

`auto_init` creates an initial commit with a README, so later lessons can branch immediately.
`private: true` and `default_branch: "main"` make those choices explicit.

```ts
// This intentionally creates a new repository, and fails if the name already exists.
const repository = unwrapRestResponse(
  await client.createCurrentUserRepo({
    body: {
      mediaType: "application/json",
      value: {
        name,
        description: "A personal project managed with the Gitea REST client",
        private: true,
        auto_init: true,
        default_branch: "main",
        readme: "Default",
      },
    },
  }),
);
```

## 3. Add the project's working labels

Each label is a separate provider request with a JSON body. These are deliberately ordinary names
you can edit for your own projects.

```ts
for (
  const label of [
    { name: "bug", color: "d73a4a", description: "Something is not working" },
    { name: "enhancement", color: "a2eeef", description: "An improvement to the project" },
    { name: "needs-triage", color: "fbca04", description: "Needs investigation or prioritization" },
  ]
) {
  unwrapRestResponse(
    await client.issueCreateLabel({
      path,
      body: { mediaType: "application/json", value: label },
    }),
  );
}
```

## 4. Connect a planning issue to a milestone

Create the milestone first, then use its returned ID in the issue request. This is why the helper
checks `milestone.id` instead of asserting that an optional field is present.

```ts
const milestone = unwrapRestResponse(
  await client.issueCreateMilestone({
    path,
    body: {
      mediaType: "application/json",
      value: { title: "First release", description: "The first usable version", state: "open" },
    },
  }),
);

const issue = unwrapRestResponse(
  await client.issueCreateIssue({
    path,
    body: {
      mediaType: "application/json",
      value: {
        title: "Plan the first release",
        body: "- [ ] Define the first use case\n- [ ] Implement it\n- [ ] Document how to run it",
        milestone: required(milestone.id, "milestone.id"),
      },
    },
  }),
);

printJson({
  owner: path.owner,
  repo: path.repo,
  repository: repository.html_url,
  milestone: milestone.title,
  issue_number: issue.number,
  issue: issue.html_url,
});
```

## Run it

```bash
deno run --allow-env --allow-net bootstrap-repository.ts
```

## Check the result

Open the printed repository URL. It should be private, have a README on `main`, and contain the
`bug`, `enhancement`, and `needs-triage` labels. The planning issue should belong to **First
release**.

Keep the printed `issue_number` for the issue-triage lesson. If the printed `owner` differs from
your current `GITEA_OWNER`, update that environment variable before continuing.

**Running again:** the same repository name is rejected. If a later step fails, earlier creations
remain; this script does not roll them back or reuse the repository. Choose a new name or inspect
the existing project before trying again.

Next, list your accessible repositories and find the project you just created.

[All examples](../../../../examples.md) ·
[Previous: Set up the raw client](../getting-started/getting-started.md) ·
[Next: Inventory your repositories](../repository-inventory/repository-inventory.md)
