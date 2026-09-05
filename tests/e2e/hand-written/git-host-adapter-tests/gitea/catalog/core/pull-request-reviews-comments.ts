import { runPullRequestReviewsCommentsContract } from "../../contracts/pull-requests/pull-request-reviews-comments-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCorePullRequestReviewsComments: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("pr-reviews");
  const changedPath = "reviewed.txt";
  const baseSha = await context.fixtures.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "review base fixture",
    changes: [{ operation: "create", path: changedPath, content: "old one\nold two\n" }],
  });
  const branch = "review-source";
  await context.fixtures.createBranch(repository, branch, baseSha);
  const fileSha = await context.fixtures.getFileSha(repository, changedPath, branch);
  await context.fixtures.commitFiles(repository, {
    branch,
    message: "review source fixture",
    changes: [{
      operation: "update",
      path: changedPath,
      sha: fileSha,
      content: "new one\nnew two\n",
    }],
  });
  const pullRequest = await context.fixtures.createPullRequest(repository, {
    title: "PanGit review actions",
    base: repository.defaultBranch,
    head: branch,
  });
  const reviewer = await context.fixtures.createUser("reviewer");
  await context.fixtures.addCollaborator(repository, reviewer.username, "write");
  return await runPullRequestReviewsCommentsContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      number: pullRequest.number,
      changedPath,
      reviewer,
    },
  });
};
