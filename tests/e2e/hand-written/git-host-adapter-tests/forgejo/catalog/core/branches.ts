import { runBranchContract } from "../../contracts/branches/branch-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runCoreBranches: ForgejoContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("branches");
  const head = "feature-diverged";
  await context.fixtures.createBranch(repository, head, repository.headSha);
  const baseSha = await context.fixtures.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "main divergence fixture",
    changes: [{ operation: "create", path: "main-only.txt", content: "main\n" }],
  });
  const headSha = await context.fixtures.commitFiles(repository, {
    branch: head,
    message: "feature divergence fixture",
    changes: [{ operation: "create", path: "feature-only.txt", content: "feature\n" }],
  });
  return await runBranchContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      base: repository.defaultBranch,
      head,
      baseSha,
      headSha,
      expectedAhead: 1,
      expectedBehind: 1,
      mutationBranch: `${context.fixtures.prefix}-branch-mutation`,
    },
  });
};
