import { runForgejoPullRequestMergeContract } from "../../extensions/pull-request-merge/forgejo-pull-request-merge-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runForgejoExtensionPullRequestMerge: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const createCandidate = async (label: string) => {
    const repository = await context.fixtures.createInitializedRepository(label);
    const branch = "extension-merge";
    await context.fixtures.createBranch(repository, branch, repository.headSha);
    const sourceSha = await context.fixtures.commitFiles(repository, {
      branch,
      message: `${label} source`,
      changes: [{ operation: "create", path: `${label}.txt`, content: `${label}\n` }],
    });
    const pullRequest = await context.fixtures.createPullRequest(repository, {
      title: `PanGit ${label}`,
      base: repository.defaultBranch,
      head: branch,
    });
    await context.fixtures.waitForPullRequestMergeable(repository, pullRequest.number);
    return {
      repository: { owner: repository.owner, name: repository.name },
      number: pullRequest.number,
      sourceSha,
    };
  };
  return await runForgejoPullRequestMergeContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      success: await createCandidate("extension-merge-success"),
      staleHead: await createCandidate("extension-merge-stale"),
      scheduled: await (async () => {
        const candidate = await createCandidate("extension-merge-scheduled");
        await context.fixtures.requireCommitStatusForBranch(
          candidate.repository,
          "main",
          "pangit/required-never-set",
        );
        await context.fixtures.waitForPullRequestMergeable(
          candidate.repository,
          candidate.number,
        );
        return candidate;
      })(),
    },
  });
};
