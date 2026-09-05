import { runForgejoFileChangeCommitContract } from "../../extensions/file-change-commit/forgejo-file-change-commit-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runForgejoExtensionFileChangeCommit: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("extension-files");
  return await runForgejoFileChangeCommitContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      branch: repository.defaultBranch,
      createdPath: "forgejo-extension.txt",
    },
  });
};
