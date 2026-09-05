import { runUnsupportedForgejoModulesContract } from "../../contracts/optional/unsupported-forgejo-modules/unsupported-forgejo-modules-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityUnsupportedForgejoModules: ForgejoContractCatalogEntry["run"] =
  async (t, context) => {
    return await runUnsupportedForgejoModulesContract(t, {
      provider: "forgejo",
      version: context.version,
      apiUrl: context.apiUrl,
    });
  };
