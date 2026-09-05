import { runCiRunDiscoveryContract } from "../../contracts/optional/ci-run-discovery/ci-run-discovery-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityCiRunDiscovery: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  return await runCiRunDiscoveryContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: await context.fixtures.createCiRunDiscoveryFixtures(),
  });
};
