import { runTagContract } from "../../contracts/tags/tag-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runCoreTags: ForgejoContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("tags");
  const existingTag = "fixture-v1";
  await context.fixtures.createTag(repository, existingTag, repository.headSha);
  return await runTagContract(t, {
    provider: "forgejo",
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
