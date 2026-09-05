import { runForgejoCommitStatusContract } from "../../extensions/commit-status/forgejo-commit-status-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runForgejoExtensionCommitStatus: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("extension-status");
  return await runForgejoCommitStatusContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      ref: repository.headSha,
    },
  });
};
