import { runGiteaIssueContentVersionContract } from "../../contracts/optional/issues/issue-content-version-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runGiteaExtensionIssueContentVersion: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository(
    "issue-content-version",
  );
  return await runGiteaIssueContentVersionContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: { repository: { owner: repository.owner, name: repository.name } },
  });
};
