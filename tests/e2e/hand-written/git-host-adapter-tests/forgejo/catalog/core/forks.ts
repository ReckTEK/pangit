import { runForkContract } from "../../contracts/forks/fork-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runCoreForks: ForgejoContractCatalogEntry["run"] = async (t, context) => {
  const source = await context.fixtures.createInitializedRepository("fork-source");
  const destination = await context.fixtures.createOrganization("fork-destination");
  const forkName = `${context.fixtures.prefix}-created-fork`;
  context.fixtures.trackKnownRepository(destination.name, forkName);
  return await runForkContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      source: { owner: source.owner, repository: source.name },
      destination,
      forkName,
    },
  });
};
