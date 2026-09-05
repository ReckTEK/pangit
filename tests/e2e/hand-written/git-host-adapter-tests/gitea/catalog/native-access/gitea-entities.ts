import { runGiteaNativeEntityAccessContract } from "../../native-access/entities/gitea-native-entity-access-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
export const runNativeAccessGiteaEntities: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("native-entities");
  const branch = "native-entity-branch";
  await context.fixtures.createBranch(repository, branch, repository.headSha);
  const contentPath = "native-entity.txt";
  const commitSha = await context.fixtures.commitFiles(repository, {
    branch,
    message: "native entity fixture",
    changes: [{ operation: "create", path: contentPath, content: "native entity\n" }],
  });
  const tag = "native-entity-tag";
  await context.fixtures.createTag(repository, tag, commitSha);
  const pullRequest = await context.fixtures.createPullRequest(repository, {
    title: "PanGit native entity fixture",
    base: repository.defaultBranch,
    head: branch,
  });
  const reviewer = await context.fixtures.createUser("nat-review");
  await context.fixtures.addCollaborator(repository, reviewer.username, "write");
  return await runGiteaNativeEntityAccessContract(t, {
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: {
        owner: repository.owner,
        name: repository.name,
        branch,
        tag,
        commitSha,
        contentPath,
        pullRequestNumber: pullRequest.number,
      },
      reviewer,
    },
  });
};
