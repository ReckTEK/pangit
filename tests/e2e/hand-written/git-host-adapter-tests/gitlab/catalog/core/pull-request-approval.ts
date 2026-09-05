import { createClient } from "../../../../../../../packages/pangit/src/fluent-client/mod.ts";
import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCorePullRequestApproval = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const user = await f.raw("POST", "/users", {
    username: `${f.prefix}-reviewer`,
    name: "PanGit Reviewer",
    email: `${f.prefix}@example.invalid`,
    password: crypto.randomUUID() + "zQ!7",
    skip_confirmation: true,
  });
  f.users.push(String(user.id));
  await f.raw("POST", `/projects/${repo.id}/members`, { user_id: user.id, access_level: 40 });
  const token = await f.raw("POST", `/users/${user.id}/personal_access_tokens`, {
    name: "review-fixture",
    scopes: ["api"],
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
  await repo.branches.create({ name: "review", source: "main" });
  await f.commit(repo.id, "review", "approve.txt", "approve");
  const pr = await repo.pullRequests.create({
    title: "Approve me",
    source: { owner: "root", repository: repo.name, branch: "review" },
    targetBranch: "main",
  });
  await f.eventually(
    () => f.raw("GET", `/projects/${repo.id}/merge_requests/${pr.number}`),
    (p) =>
      !!p.diff_refs &&
      !["checking", "approvals_syncing"].includes(String(p.detailed_merge_status)),
    "approval readiness",
  );
  const reviewer = await (await createClient("gitlab", f.version, f.apiUrl)).auth.token(
    String(token.token),
  );
  const reviewed = await (await reviewer.container("root")).repository(repo.name);
  await reviewed.pullRequests.approve(
    await reviewed.pullRequests.get(pr.number),
    "Reviewed via PanGit",
  );
  const approvals = await f.raw(
    "GET",
    `/projects/${repo.id}/merge_requests/${pr.number}/approvals`,
  );
  f.assert(
    JSON.stringify(approvals.approved_by).includes(`${f.prefix}-reviewer`),
    "Real separate reviewer approval persisted",
  );
  const reviews = reviewed.pullRequests.reviews(pr);
  f.equal(
    reviews.support.supported,
    false,
    "Persistent review objects are explicitly unsupported",
  );
};
