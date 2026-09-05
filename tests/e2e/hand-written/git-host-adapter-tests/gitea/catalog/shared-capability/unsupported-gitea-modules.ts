import { runUnsupportedGiteaModulesContract } from "../../contracts/optional/unsupported-gitea-modules/unsupported-gitea-modules-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityUnsupportedGiteaModules: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  return await runUnsupportedGiteaModulesContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
  });
};
