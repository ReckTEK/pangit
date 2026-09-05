import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreRepositories = async (f: GitLabE2EFixtureDriver) => {
  const client = await f.client();
  const owner = await f.prove(
    "namespace direct lookup",
    ["getApiV4NamespacesId"],
    () => client.container("root"),
  );
  f.equal(owner.kind, "user", "Root is a user namespace");
  const repo = await owner.createRepository(`${f.prefix}-created`, {
    private: true,
    files: [{ path: "hello.txt", content: "世界\n" }],
    defaultBranch: "main",
  });
  f.projects.push(repo.id);
  f.equal(repo.defaultBranch, "main", "Initial files create default branch");
  f.equal(
    await repo.content.readText("hello.txt"),
    "世界\n",
    "Initial contents survive encoding",
  );
  f.assert(await owner.hasRepository(repo.name), "Repository exists");
  f.equal(
    await owner.findRepository(`${f.prefix}-missing`),
    undefined,
    "Missing repository is optional",
  );
  const page = await owner.repositories({ limit: 1 });
  f.equal(page.items.length, 1, "Repository listing respects page size");
  f.assert(page.nextCursor, "Repository listing exposes continuation");
  const next = await owner.repositories({ limit: 1, cursor: page.nextCursor });
  f.assert(
    next.items[0].id !== page.items[0].id,
    "Continuation does not repeat first repository",
  );
  const renamed = await repo.rename(`${repo.name}-renamed`);
  f.assert(renamed.name !== repo.name, "Rename returns a new immutable snapshot");
  await renamed.delete();
  f.projects.splice(f.projects.indexOf(repo.id), 1);
};
