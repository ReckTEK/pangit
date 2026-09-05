import { runCurrentUserProfileContract } from "../../contracts/optional/current-user-profile/current-user-profile-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityCurrentUserProfile: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  return await runCurrentUserProfileContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: { expectedUsername: context.fixtures.currentUser },
  });
};
