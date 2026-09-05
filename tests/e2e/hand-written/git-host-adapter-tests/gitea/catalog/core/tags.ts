import { runTagContract } from "../../contracts/tags/tag-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCoreTags: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("tags");
  const existingTag = "fixture-v1";
  await context.fixtures.createTag(repository, existingTag, repository.headSha);
  return await runTagContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      targetSha: repository.headSha,
      existingTag,
      mutationTag: "fluent-v2",
    },
  });
};
