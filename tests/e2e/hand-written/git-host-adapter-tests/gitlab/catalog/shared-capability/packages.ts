import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityPackages = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const response = await fetch(
    `${f.apiUrl}/api/v4/projects/${repo.id}/packages/generic/pangit-fixture/1.0.0/hello.txt`,
    { method: "PUT", headers: { "PRIVATE-TOKEN": f.token }, body: "package bytes" },
  );
  f.equal(response.status, 201, "Real generic package upload fixture");
  await response.body?.cancel();
  const client = await f.client();
  const identity = {
    owner: repo.fullName,
    type: "generic",
    name: "pangit-fixture",
    version: "1.0.0",
  };
  const pkg = await client.packages.get(identity);
  f.equal(pkg.version, "1.0.0", "Exact package version lookup");
  const files = await client.packages.files(identity, { maxFiles: 10 });
  f.equal(files[0].name, "hello.txt", "Package file metadata");
  f.equal(
    (await f.prove(
      "Package versions fetch one page",
      ["getApiV4ProjectsIdPackages"],
      () => client.packages.versions(identity),
    )).items.length,
    1,
    "Package versions one-page listing",
  );
  await client.packages.deleteVersion(identity);
  await f.eventually(
    () => client.packages.find(identity),
    (p) => p === undefined,
    "package deletion",
  );
  f.assert(true, "Package version deleted");
};
