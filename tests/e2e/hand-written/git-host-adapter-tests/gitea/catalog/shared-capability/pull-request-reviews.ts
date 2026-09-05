import { runPullRequestReviewContract } from "../../contracts/optional/pull-request-reviews/pull-request-review-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityPullRequestReviews: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const reviewer = await context.fixtures.createUser("opt-review");
  const repository = await context.fixtures.createInitializedRepository("review-objects");
  await context.fixtures.addCollaborator(repository, reviewer.username, "write");
  const branch = "review-object-source";
  await context.fixtures.createBranch(repository, branch, repository.headSha);
  await context.fixtures.commitFiles(repository, {
    branch,
    message: "add review-object source",
    changes: [{ operation: "create", path: "review-object.txt", content: "review me\n" }],
  });
  const pullRequest = await context.fixtures.createPullRequest(repository, {
    title: "PanGit review-object fixture",
    base: repository.defaultBranch,
    head: branch,
  });
  return await runPullRequestReviewContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      pullRequestNumber: pullRequest.number,
      reviewer,
    },
  });
};
