import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreTags = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const sha = (await repo.branches.get("main")).sha;
  const tag = await repo.tags.create({
    name: "v1/encoded",
    target: sha,
    message: "annotated tag",
  });
  f.equal(tag.sha, sha, "Annotated tag points to commit");
  f.equal(
    (await f.prove(
      "Tag lookup is direct",
      ["getApiV4ProjectsIdRepositoryTagsTagName"],
      () => repo.tags.get(tag.name),
    )).name,
    tag.name,
    "Encoded tag lookup",
  );
  f.equal((await repo.tags.list({ limit: 1 })).items.length, 1, "Tags one-page listing");
  await repo.tags.delete(tag);
  await f.rejects(() => repo.tags.get(tag.name), "NotFoundError");
};
