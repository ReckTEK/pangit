# Submit content through a pull request

[All examples](../../../../examples.md) ·
[Previous: Inventory your repositories](../repository-inventory/repository-inventory.md) ·
[Next: Triage an issue](../issue-triage/issue-triage.md)

**Raw REST clients · Gitea 1.27.2 · Lesson 4 of 8**

Submit a blog post or documentation change to a Git-backed site without cloning its repository. You
will read a local file, put it on a new branch through the Contents API, and open a pull request for
review.

**Before you start:** complete [client setup](../getting-started/getting-started.md), and choose a
repository where you can write code and open PRs. It must already contain a commit;
[repository setup](../repository-setup/repository-setup.md) creates one.

**Writes:** one review branch, one file commit, and one pull request. The base branch is not changed
and the PR is not merged.

## 1. Prepare the local content and read the base branch

Use your own file, or create a small Markdown post:

```bash
mkdir -p drafts
cat > drafts/hello-world.md <<'MARKDOWN'
# Hello, world

This post will reach the repository through a pull request.
MARKDOWN

export CONTENT_FILE='./drafts/hello-world.md'
export REPO_FILE='content/posts/hello-world.md'
export CHANGE_BRANCH='content/hello-world'
export PR_TITLE='Add the hello-world post'
```

`CONTENT_FILE` is a local path; `REPO_FILE` is a path inside Gitea. Choose an unused
`CHANGE_BRANCH`.

Save the TypeScript blocks below, in order, as [`content-pull-request.ts`](content-pull-request.ts)
**beside `client.ts` in your own Deno project**.

Read the local bytes before making any remote changes. The Contents API requires base64, so encode
the bytes directly to preserve UTF-8 content. The base defaults to the repository's default branch;
`BASE_BRANCH` can override it.

```ts
/** Publish a local document to a review branch, creating or updating the file without a clone. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, printJson, repositoryPath, required } from "./client.ts";

const path = repositoryPath();
const filepath = env("REPO_FILE");
const branch = env("CHANGE_BRANCH");
const title = env("PR_TITLE");
// Read before creating anything remotely. Encoding bytes preserves UTF-8 and binary content.
const content = (await Deno.readFile(env("CONTENT_FILE"))).toBase64();
const client = await createClient();
const repository = unwrapRestResponse(await client.repoGet({ path }));
const base = Deno.env.get("BASE_BRANCH") ?? required(repository.default_branch, "default_branch");
if (branch === base) throw new Error("CHANGE_BRANCH must differ from the base branch.");
```

## 2. Create an isolated review branch

Branch from `base` with `old_ref_name`. An existing review branch causes an error instead of a
force-push.

```ts
// Use a fresh branch name. Never force-push or overwrite an existing review branch.
unwrapRestResponse(
  await client.repoCreateBranch({
    path,
    body: {
      mediaType: "application/json",
      value: { new_branch_name: branch, old_ref_name: base },
    },
  }),
);
```

## 3. Create or update the remote file

Read the target on the new branch. A 404 means the file can be created. Otherwise, require a regular
file and send its blob SHA with the update so a concurrent edit is not silently overwritten.

```ts
const filePath = { ...path, filepath };
const existing = await client.repoGetContents({ path: filePath, query: { ref: branch } });
const change = { branch, content, message: title };

if (existing.status === 404) {
  // Only a missing file selects the create path; authentication/server errors still fail.
  unwrapRestResponse(
    await client.repoCreateFile({
      path: filePath,
      body: { mediaType: "application/json", value: change },
    }),
  );
} else {
  const file = unwrapRestResponse(existing);
  if (Array.isArray(file) || file.type !== "file") {
    throw new Error(`${filepath} is not a regular file.`);
  }
  unwrapRestResponse(
    await client.repoUpdateFile({
      path: filePath,
      body: {
        mediaType: "application/json",
        // The file's blob SHA protects against silently overwriting a concurrent edit.
        value: { ...change, sha: required(file.sha, "file.sha") },
      },
    }),
  );
}
```

Only the expected missing-file response selects creation. Authentication, permission, and server
errors still fail through `unwrapRestResponse`.

## 4. Open the pull request

`head` names the new branch and `base` names its merge target. The API returns the PR's URL and
number for the next human step.

```ts
const pull = unwrapRestResponse(
  await client.repoCreatePullRequest({
    path,
    body: {
      mediaType: "application/json",
      value: {
        head: branch,
        base,
        title,
        body: `Update \`${filepath}\` from a local file.\n\nPlease review before merging.`,
      },
    },
  }),
);

printJson({ branch, base, pull_request: pull.html_url, number: pull.number });
```

## Run it

```bash
deno run --allow-env --allow-net --allow-read="$CONTENT_FILE" \
  content-pull-request.ts
```

## Check the result

Open `pull_request` from the output. The PR should show your local file's contents, target the
printed base branch, and remain open. The base branch should still be unchanged.

To exercise the update path, set `REPO_FILE='README.md'`, choose another unused `CHANGE_BRANCH`, and
rerun with your replacement local content.

**Running again:** the same review branch is rejected. If a later request fails, the branch or
commit can remain for inspection. Use a fresh branch name or clean up the unfinished change
yourself.

Next, record an investigation note on the planning issue without replacing its existing labels.

[All examples](../../../../examples.md) ·
[Previous: Inventory your repositories](../repository-inventory/repository-inventory.md) ·
[Next: Triage an issue](../issue-triage/issue-triage.md)
