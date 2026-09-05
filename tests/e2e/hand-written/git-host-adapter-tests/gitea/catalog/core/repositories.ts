import { runRepositoryContract } from "../../contracts/repositories/repository-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCoreRepositories: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const fixtures = await context.fixtures.createRepositoryFixtures();
  return await runRepositoryContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures,
  });
};
