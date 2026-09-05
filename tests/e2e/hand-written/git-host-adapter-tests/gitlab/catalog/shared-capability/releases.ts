import { GitLabOAuthFixture } from "../../GitLabOAuthFixture.ts";
import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityReleases = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  const release = await repo.releases.create({
    tagName: "v1.0.0",
    name: "Release",
    description: "Notes",
    target: "main",
  });
  f.equal(
    (await f.prove(
      "Release tag lookup is direct",
      ["getApiV4ProjectsIdReleasesTagName"],
      () => repo.releases.getByTag(release.tagName),
    )).id,
    release.id,
    "Release tag identity",
  );
  const asset = await repo.releases.assets.upload(release, {
    name: "asset.txt",
    data: new TextEncoder().encode("asset body"),
  });
  f.assert(asset.downloadUrl, "Release asset has download URL");
  const browser = new GitLabOAuthFixture(f.apiUrl, "root", f.password);
  await browser.login();
  const response = await browser.download(asset.downloadUrl!);
  f.equal(await response.text(), "asset body", "Uploaded release asset is downloadable");
  f.equal(
    (await repo.releases.assets.list(release, { maxItems: 10 })).length,
    1,
    "Release assets bounded listing",
  );
  const renamed = await repo.releases.assets.update(release, asset, { name: "renamed.txt" });
  f.equal(
    (await repo.releases.assets.get(release, renamed.id)).name,
    "renamed.txt",
    "Asset rename",
  );
  await repo.releases.assets.delete(release, renamed);
  const updated = await repo.releases.update(release, { description: "Updated notes" });
  f.equal(updated.description, "Updated notes", "Release update");
  await repo.releases.delete(updated);
  f.equal((await repo.releases.list()).items.length, 0, "Release deletion");
};
