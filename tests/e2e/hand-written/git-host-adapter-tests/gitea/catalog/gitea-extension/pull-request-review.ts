import { runGiteaPullRequestReviewContract } from "../../extensions/pull-request-review/gitea-pull-request-review-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runGiteaExtensionPullRequestReview: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("extension-review");
  const changedPath = "extension-reviewed.txt";
  const baseSha = await context.fixtures.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "Gitea review extension base",
    changes: [{ operation: "create", path: changedPath, content: "old line\n" }],
  });
  const branch = "extension-review-head";
  await context.fixtures.createBranch(repository, branch, baseSha);
  const fileSha = await context.fixtures.getFileSha(repository, changedPath, branch);
  const sourceSha = await context.fixtures.commitFiles(repository, {
    branch,
    message: "Gitea review extension source",
    changes: [{
      operation: "update",
      path: changedPath,
      sha: fileSha,
      content: "new line\n",
    }],
  });
  const pullRequest = await context.fixtures.createPullRequest(repository, {
    title: "PanGit Gitea review extension",
    base: repository.defaultBranch,
    head: branch,
  });
  const reviewer = await context.fixtures.createUser("ext-review");
  await context.fixtures.addCollaborator(repository, reviewer.username, "write");
  return await runGiteaPullRequestReviewContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      pullRequestNumber: pullRequest.number,
      sourceSha,
      changedPath,
      reviewer,
    },
  });
};
