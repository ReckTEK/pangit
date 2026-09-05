import { runPullRequestMergeContract } from "../../contracts/pull-requests/pull-request-merge-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCorePullRequestMerge: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const createMergeCandidate = async (label: string, branch: string, path: string) => {
    const repository = await context.fixtures.createInitializedRepository(label);
    await context.fixtures.createBranch(repository, branch, repository.headSha);
    await context.fixtures.commitFiles(repository, {
      branch,
      message: `${branch} fixture`,
      changes: [{ operation: "create", path, content: `${branch}\n` }],
    });
    const pullRequest = await context.fixtures.createPullRequest(repository, {
      title: `PanGit ${branch}`,
      base: repository.defaultBranch,
      head: branch,
    });
    await context.fixtures.waitForPullRequestMergeable(repository, pullRequest.number);
    return {
      repository: { owner: repository.owner, name: repository.name },
      number: pullRequest.number,
      sourceBranch: branch,
    };
  };
  const defaultMerge = await createMergeCandidate(
    "pr-merge-default",
    "merge-default",
    "merge-default.txt",
  );
  const squashMerge = await createMergeCandidate(
    "pr-merge-squash",
    "merge-squash",
    "merge-squash.txt",
  );
  return await runPullRequestMergeContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      defaultMerge,
      squashMerge,
    },
  });
};
