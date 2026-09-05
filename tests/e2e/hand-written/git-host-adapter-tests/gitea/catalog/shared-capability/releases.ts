import { runReleaseContract } from "../../contracts/optional/releases/release-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runSharedCapabilityReleases: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("releases");
  const tagName = "optional-release-v1";
  await context.fixtures.createTag(repository, tagName, repository.headSha);
  return await runReleaseContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      tagName,
      asset: {
        name: "release-fixture.bin",
        renamedName: "release-fixture-renamed.bin",
        bytes: [0, 1, 2, 127, 128, 255],
      },
    },
  });
};
