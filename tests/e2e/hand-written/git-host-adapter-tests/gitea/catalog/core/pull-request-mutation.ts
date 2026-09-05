import { runPullRequestMutationContract } from "../../contracts/pull-requests/pull-request-mutation-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCorePullRequestMutation: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("pr-mutation");
  const createSource = async (
    owner: string,
    name: string,
    branch: string,
    source: string,
    path: string,
  ) => {
    const target = { owner, name };
    await context.fixtures.createBranch(target, branch, source);
    const sha = await context.fixtures.commitFiles(target, {
      branch,
      message: `${branch} fixture`,
      changes: [{ operation: "create" as const, path, content: `${branch}\n` }],
    });
    return { owner, repository: name, branch, sha, changedPath: path };
  };
  const sameRepository = await createSource(
    repository.owner,
    repository.name,
    "mutation-same",
    repository.headSha,
    "mutation-same.txt",
  );
  const closeSource = await createSource(
    repository.owner,
    repository.name,
    "mutation-close",
    repository.headSha,
    "mutation-close.txt",
  );
  const forkOwner = await context.fixtures.createOrganization("prm");
  const forkName = `${context.fixtures.prefix}-pr-mutation-fork`;
  await context.fixtures.createFork(repository, forkOwner.name, forkName);
  const crossFork = await createSource(
    forkOwner.name,
    forkName,
    "mutation-cross",
    repository.headSha,
    "mutation-cross.txt",
  );
  return await runPullRequestMutationContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      base: repository.defaultBranch,
      sameRepository,
      crossFork,
      closeSource,
    },
  });
};
