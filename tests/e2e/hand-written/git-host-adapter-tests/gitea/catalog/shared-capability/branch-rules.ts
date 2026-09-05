import { runBranchRuleContract } from "../../contracts/optional/branch-rules/branch-rule-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityBranchRules: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("branch-rules");
  return await runBranchRuleContract(t, {
    provider: "gitea",
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
