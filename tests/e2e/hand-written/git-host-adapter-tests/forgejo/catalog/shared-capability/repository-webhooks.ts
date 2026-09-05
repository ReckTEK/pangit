import { runRepositoryWebhookContract } from "../../contracts/optional/repository-webhooks/repository-webhook-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityRepositoryWebhooks: ForgejoContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("webhooks");
  return await runRepositoryWebhookContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      branch: repository.defaultBranch,
      receiver: context.fixtures.createWebhookReceiver("repository-webhooks"),
    },
  });
};
