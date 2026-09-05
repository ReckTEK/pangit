import { runForgejoNativeClientAccessContract } from "../../native-access/client/forgejo-native-client-access-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runNativeAccessForgejoClient: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  return await runForgejoNativeClientAccessContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
  });
};
