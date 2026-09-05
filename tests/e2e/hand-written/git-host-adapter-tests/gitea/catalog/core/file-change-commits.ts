import { runFileChangeContract } from "../../contracts/content/file-change-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runCoreFileChangeCommits: GiteaContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("file-changes");
  const originalHeadSha = await context.fixtures.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "file-change starting tree",
    changes: [
      { operation: "create", path: "update.txt", content: "before update\n" },
      { operation: "create", path: "delete.txt", content: "delete me\n" },
      { operation: "create", path: "move.txt", content: "move me\n" },
    ],
  });
  return await runFileChangeContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      branch: repository.defaultBranch,
      originalHeadSha,
      updatePath: "update.txt",
      deletePath: "delete.txt",
      movePath: "move.txt",
      createdPath: "created.txt",
      movedPath: "moved.txt",
      newBranch: "batch-created-branch",
    },
  });
};
