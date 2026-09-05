import { runPackageContract } from "../../contracts/optional/packages/package-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityPackages: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  return await runPackageContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: await context.fixtures.createPackageFixtures(),
  });
};
