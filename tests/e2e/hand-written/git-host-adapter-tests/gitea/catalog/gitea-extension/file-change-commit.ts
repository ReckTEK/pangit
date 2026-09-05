import { runGiteaFileChangeCommitContract } from "../../extensions/file-change-commit/gitea-file-change-commit-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runGiteaExtensionFileChangeCommit: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("extension-files");
  return await runGiteaFileChangeCommitContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      branch: repository.defaultBranch,
      createdPath: "gitea-extension.txt",
    },
  });
};
