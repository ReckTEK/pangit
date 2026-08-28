# Triage an issue

[All examples](../../../../examples.md) ·
[Previous: Submit content through a pull request](../content-pull-requests/content-pull-requests.md)
· [Next: Publish a release and its artifact](../releases/releases.md)

**Raw REST clients · Gitea 1.27.2 · Lesson 5 of 8**

Record a useful investigation note on an issue while retaining the labels already applied by you or
another contributor. You will find or create `needs-triage`, add it to the issue, and post the exact
note you supply.

**Before you start:** complete [client setup](../getting-started/getting-started.md) and use a
repository where you can manage issues and labels. The planning issue from
[repository setup](../repository-setup/repository-setup.md) is a suitable target.

**Writes:** adds a triage label and a comment; also creates the repository label if it is missing.
It does not close the issue or invent a diagnosis.

## 1. Choose the issue and your note

Use the issue's displayed number, such as `#1`, rather than its database ID. If you followed
repository setup, use the printed `issue_number`.

```bash
export ISSUE_NUMBER='1'
export TRIAGE_NOTE='Investigate whether the attachment upload timeout is reproducible on a slow link.'
```

Save the TypeScript blocks below, in order, as [`triage-issue.ts`](triage-issue.ts) **beside
`client.ts` in your own Deno project**.

Validate the number and load the issue before writing. Gitea shares issue numbering with PRs, so
reject a PR target explicitly.

```ts
/** Add a triage label and a human-supplied note to an existing issue. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, paginate, printJson, repositoryPath, required } from "./client.ts";

const path = repositoryPath();
const number = env("ISSUE_NUMBER");
if (!/^[1-9]\d*$/.test(number)) throw new Error("ISSUE_NUMBER must be a positive integer.");
const issuePath = { ...path, index: BigInt(number) };
const note = env("TRIAGE_NOTE");
const client = await createClient();
const issue = unwrapRestResponse(await client.issueGetIssue({ path: issuePath }));
if (issue.pull_request) throw new Error("Choose an issue, not a pull request.");
```

## 2. Reuse or create the triage label

Scan the repository's label pages by name. Only create a label if no existing `needs-triage` label
was found, then retain its returned ID for the next request.

```ts
const labelName = "needs-triage";
let labelId: number | bigint | undefined;
for await (
  const label of paginate(async (page, limit) =>
    unwrapRestResponse(await client.issueListLabels({ path, query: { page, limit } }))
  )
) {
  if (label.name === labelName) {
    labelId = required(label.id, "label.id");
    break;
  }
}

if (labelId === undefined) {
  const label = unwrapRestResponse(
    await client.issueCreateLabel({
      path,
      body: {
        mediaType: "application/json",
        value: {
          name: labelName,
          color: "fbca04",
          description: "Needs investigation or prioritization",
        },
      },
    }),
  );
  labelId = required(label.id, "label.id");
}
```

## 3. Add the label without replacing the set

`issueAddLabel` adds the selected label. Supplying a replacement label set would unnecessarily
discard unrelated labels.

```ts
// Add labels rather than replacing the issue's current label set.
const labels = unwrapRestResponse(
  await client.issueAddLabel({
    path: issuePath,
    body: { mediaType: "application/json", value: { labels: [labelId] } },
  }),
);
```

## 4. Post your note and return the links

Send the note as the comment's JSON body. The output includes the issue URL, its resulting label
names, and the new comment URL.

```ts
const comment = unwrapRestResponse(
  await client.issueCreateComment({
    path: issuePath,
    body: { mediaType: "application/json", value: { body: note } },
  }),
);

printJson({
  issue: issue.html_url,
  labels: labels.map((label) => label.name),
  comment: comment.html_url,
});
```

## Run it

```bash
deno run --allow-env --allow-net triage-issue.ts
```

## Check the result

The issue should retain its previous labels, gain `needs-triage`, and contain a comment matching
`TRIAGE_NOTE`. Its open/closed state should be unchanged.

**Running again:** the label is reused, but a new comment is posted each time. A label can remain
applied if posting the comment fails; the two requests are not a transaction.

Next, publish a built artifact through a draft release.

[All examples](../../../../examples.md) ·
[Previous: Submit content through a pull request](../content-pull-requests/content-pull-requests.md)
· [Next: Publish a release and its artifact](../releases/releases.md)
