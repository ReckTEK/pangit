/** Start a personal project with a private repo, labels, a milestone, and a planning issue. */
import { unwrapRestResponse } from "@mannsion/pangit";
import { createClient, env, printJson, required } from "./client.ts";

const name = env("GITEA_REPO");
const client = await createClient();
const user = unwrapRestResponse(await client.userGetCurrent());
const path = { owner: required(user.login, "user.login"), repo: name };

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
