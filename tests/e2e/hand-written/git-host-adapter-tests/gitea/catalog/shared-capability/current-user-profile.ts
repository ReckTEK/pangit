import { runCurrentUserProfileContract } from "../../contracts/optional/current-user-profile/current-user-profile-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityCurrentUserProfile: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  return await runCurrentUserProfileContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: { expectedUsername: context.fixtures.currentUser },
  });
};
