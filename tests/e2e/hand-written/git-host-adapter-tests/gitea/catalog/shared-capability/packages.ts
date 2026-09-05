import { runPackageContract } from "../../contracts/optional/packages/package-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityPackages: GiteaContractCatalogEntry["run"] = async (t, context) => {
  return await runPackageContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: await context.fixtures.createPackageFixtures(),
  });
};
