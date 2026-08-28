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

// Add labels rather than replacing the issue's current label set.
const labels = unwrapRestResponse(
  await client.issueAddLabel({
    path: issuePath,
    body: { mediaType: "application/json", value: { labels: [labelId] } },
  }),
);

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
