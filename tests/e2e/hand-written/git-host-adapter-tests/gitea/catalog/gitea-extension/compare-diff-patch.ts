import { runGiteaCompareDiffPatchContract } from "../../extensions/compare-diff-patch/gitea-compare-diff-patch-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runGiteaExtensionCompareDiffPatch: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("extension-compare");
  const base = repository.headSha;
  const branch = "extension-compare-head";
  await context.fixtures.createBranch(repository, branch, base);
  const changedPath = "extension-compare.txt";
  const head = await context.fixtures.commitFiles(repository, {
    branch,
    message: "Gitea raw comparison fixture",
    changes: [{ operation: "create", path: changedPath, content: "compare me\n" }],
  });
  return await runGiteaCompareDiffPatchContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      base,
      head,
      changedPath,
    },
  });
};
