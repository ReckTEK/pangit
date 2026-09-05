import { runCommitStatusContract } from "../../contracts/commit-statuses/commit-status-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCoreCommitStatuses: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("statuses");
  const branch = "status-branch";
  await context.fixtures.createBranch(repository, branch, repository.headSha);
  const commitSha = await context.fixtures.commitFiles(repository, {
    branch,
    message: "status fixture commit",
    changes: [{ operation: "create", path: "status.txt", content: "status\n" }],
  });
  const tag = "status-tag";
  await context.fixtures.createTag(repository, tag, commitSha);
  const pullRequest = await context.fixtures.createPullRequest(repository, {
    title: "PanGit status PR",
    base: repository.defaultBranch,
    head: branch,
  });
  if (pullRequest.number <= 0) throw new Error("Status PR fixture is invalid");
  const providerOnlyContext = "pangit/provider-warning";
  await context.fixtures.createCommitStatus(repository, commitSha, {
    context: providerOnlyContext,
    state: "warning",
    description: "provider-only state fixture",
  });
  return await runCommitStatusContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      commitSha,
      branch,
      tag,
      pullRequestNumber: pullRequest.number,
      providerOnlyContext,
      providerOnlyState: "warning",
    },
  });
};
