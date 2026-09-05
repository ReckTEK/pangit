import { runBranchRulePriorityContract } from "../../contracts/optional/branch-rules/branch-rule-priority-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runGiteaExtensionBranchRulePriority: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("branch-rule-priority");
  return await runBranchRulePriorityContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      orderedRuleNames: ["priority-first", "priority-second"],
    },
  });
};
