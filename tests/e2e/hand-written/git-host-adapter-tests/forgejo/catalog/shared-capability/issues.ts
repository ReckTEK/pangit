import { runIssueContract } from "../../contracts/optional/issues/issue-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityIssues: ForgejoContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("issues");
  return await runIssueContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: { repository: { owner: repository.owner, name: repository.name } },
  });
};
