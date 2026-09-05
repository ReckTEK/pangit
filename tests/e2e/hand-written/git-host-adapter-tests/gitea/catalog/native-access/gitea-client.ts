import { runGiteaNativeClientAccessContract } from "../../native-access/client/gitea-native-client-access-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runNativeAccessGiteaClient: GiteaContractCatalogEntry["run"] = async (t, context) => {
  return await runGiteaNativeClientAccessContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
  });
};
