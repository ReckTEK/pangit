import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runSharedCapabilityBlobReads = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  await f.commit(repo.id, "main", "blob.txt", "blob\n");
  const content = await repo.content.read("blob.txt", { includeBytes: false });
  const blob = await repo.blobs.get(content.sha!);
  f.equal([...blob.bytes], [...new TextEncoder().encode("blob\n")], "Git object blob bytes");
  f.equal(blob.sha, content.sha, "Blob SHA independently verified");
  await f.prove("Native entity access has zero requests", [], async () => {
    await content.native.gitlab(({ content }) =>
      f.assert(!!content, "Original content payload preserved")
    );
    await blob.native.gitlab(({ blob }) => f.assert(!!blob, "Original blob payload preserved"));
  });
};
