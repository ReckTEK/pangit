import { runCommitContract } from "../../contracts/commits/commit-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
export const runCoreCommits: ForgejoContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("commits");
  const head = "feature-commits";
  await context.fixtures.createBranch(repository, head, repository.headSha);
  const baseChangedPath = "main-commit.txt";
  const baseSha = await context.fixtures.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "main commit fixture",
    changes: [{ operation: "create", path: baseChangedPath, content: "main\n" }],
  });
  const headSha = await context.fixtures.commitFiles(repository, {
    branch: head,
    message: "feature commit fixture",
    changes: [{ operation: "create", path: "feature-commit.txt", content: "feature\n" }],
  });
  const headTag = "feature-head";
  await context.fixtures.createTag(repository, headTag, headSha);
  return await runCommitContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      rootSha: repository.headSha,
      base: repository.defaultBranch,
      baseSha,
      head,
      headSha,
      baseChangedPath,
      headTag,
    },
  });
};
