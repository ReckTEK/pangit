import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityIssues = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const issue = await repo.issues.create({ title: "Issue", description: "Initial" });
  const directIssue = await f.prove("Issue lookup is direct", [
    "getApiV4ProjectsIdIssuesIssueIid",
  ], () => repo.issues.get(issue.number));
  f.equal(directIssue.id, issue.id, "Issue direct identity");
  const updated = await repo.issues.update(issue, { title: "Updated", description: "Body" })
    .execute();
  f.equal(updated.title, "Updated", "Issue update");
  const comment = await repo.issues.comments.create(issue, { body: "Comment" });
  f.equal(
    (await repo.issues.comments.get(comment.id)).body,
    "Comment",
    "Direct note ID retains issue identity",
  );
  const edited = await repo.issues.comments.update(comment, { body: "Edited" });
  f.equal(edited.body, "Edited", "Note update");
  f.assert(
    (await repo.issues.comments.list(issue)).items.some((c) => c.id === comment.id),
    "Notes list",
  );
  await repo.issues.comments.delete(edited);
  f.equal((await repo.issues.setState(updated, "closed")).state, "closed", "Issue close");
  f.equal((await repo.issues.list({ state: "closed" })).items.length, 1, "Issue state filter");
};
