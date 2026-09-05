import { runGiteaCommitStatusContract } from "../../extensions/commit-status/gitea-commit-status-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runGiteaExtensionCommitStatus: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("extension-status");
  return await runGiteaCommitStatusContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      ref: repository.headSha,
    },
  });
};
