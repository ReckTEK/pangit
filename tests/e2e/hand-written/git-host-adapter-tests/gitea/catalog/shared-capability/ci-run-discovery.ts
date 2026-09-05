import { runCiRunDiscoveryContract } from "../../contracts/optional/ci-run-discovery/ci-run-discovery-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityCiRunDiscovery: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  return await runCiRunDiscoveryContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: await context.fixtures.createCiRunDiscoveryFixtures(),
  });
};
