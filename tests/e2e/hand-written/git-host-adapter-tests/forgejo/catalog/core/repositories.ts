import { runRepositoryContract } from "../../contracts/repositories/repository-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runCoreRepositories: ForgejoContractCatalogEntry["run"] = async (t, context) => {
  const fixtures = await context.fixtures.createRepositoryFixtures();
  return await runRepositoryContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures,
  });
};
