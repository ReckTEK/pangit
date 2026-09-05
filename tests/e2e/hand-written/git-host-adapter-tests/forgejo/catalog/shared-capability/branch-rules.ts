import { runBranchRuleContract } from "../../contracts/optional/branch-rules/branch-rule-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityBranchRules: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("branch-rules");
  return await runBranchRuleContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      branch: repository.defaultBranch,
      ruleName: repository.defaultBranch,
    },
  });
};
