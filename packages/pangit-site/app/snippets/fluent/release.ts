import type { Repository } from "@recktek/pangit/api";
declare const repo: Repository<"gitea", "1.27.2">;
// @example
if (repo.releases.support.supported) {
  const release = await repo.releases.create({
    tagName: "v1.0.0",
    target: "main",
    name: "Version 1.0",
    description: "The first release.",
  });
  const asset = await repo.releases.assets.upload(release, {
    name: "checksums.txt",
    data: new TextEncoder().encode("example checksum\n"),
  });
  console.log(release.url, asset.downloadUrl);
}
