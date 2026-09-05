import { runPullRequestDiscoveryContract } from "../../contracts/pull-requests/pull-request-discovery-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCorePullRequestDiscovery: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("pr-discovery");
  const sameBranch = "discovery-same";
  const samePath = "same-source.txt";
  await context.fixtures.createBranch(repository, sameBranch, repository.headSha);
  const sameSha = await context.fixtures.commitFiles(repository, {
    branch: sameBranch,
    message: "same-repository PR discovery fixture",
    changes: [{ operation: "create", path: samePath, content: "same\n" }],
  });
  const sameTitle = "PanGit discovery same repository";
  const samePullRequest = await context.fixtures.createPullRequest(repository, {
    title: sameTitle,
    body: "same-repository discovery fixture",
    base: repository.defaultBranch,
    head: sameBranch,
  });
  await context.fixtures.waitForPullRequestSearch(
    repository,
    samePullRequest.number,
    sameTitle,
  );

  const forkOwner = await context.fixtures.createOrganization("prd");
  const forkName = `${context.fixtures.prefix}-pr-discovery-fork`;
  await context.fixtures.createFork(repository, forkOwner.name, forkName);
  const crossBranch = "discovery-cross";
  const crossPath = "cross-source.txt";
  const forkRepository = { owner: forkOwner.name, name: forkName };
  await context.fixtures.createBranch(forkRepository, crossBranch, repository.headSha);
  const crossSha = await context.fixtures.commitFiles(forkRepository, {
    branch: crossBranch,
    message: "cross-fork PR discovery fixture",
    changes: [{ operation: "create", path: crossPath, content: "cross\n" }],
  });
  const crossPullRequest = await context.fixtures.createPullRequest(repository, {
    title: "PanGit discovery cross fork",
    base: repository.defaultBranch,
    head: `${forkOwner.name}:${crossBranch}`,
  });

  return await runPullRequestDiscoveryContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      base: repository.defaultBranch,
      sameRepository: {
        owner: repository.owner,
        repository: repository.name,
        branch: sameBranch,
        sha: sameSha,
        changedPath: samePath,
        number: samePullRequest.number,
        title: sameTitle,
      },
      crossFork: {
        owner: forkOwner.name,
        repository: forkName,
        branch: crossBranch,
        sha: crossSha,
        changedPath: crossPath,
        number: crossPullRequest.number,
      },
    },
  });
};
