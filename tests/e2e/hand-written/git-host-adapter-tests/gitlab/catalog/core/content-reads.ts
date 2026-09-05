import type { GitLabE2EFixtureDriver } from "../../GitLabE2EFixtureDriver.ts";

export const runCoreContentReads = async (f: GitLabE2EFixtureDriver) => {
  const repo = await f.project();
  await repo.content.commitChanges({
    branch: "main",
    message: "content",
    changes: [
      { operation: "create", path: "unicodé-文件.txt", content: "世界 🌍\n" },
      { operation: "create", path: "binary.bin", content: new Uint8Array([0, 128, 255]) },
      { operation: "create", path: "empty.txt", content: "" },
      { operation: "create", path: "config.json", content: '{"ok":true}' },
      { operation: "create", path: "nested/deep/file.txt", content: "nested" },
    ],
  }).execute();
  f.equal(
    await repo.content.readText("unicodé-文件.txt"),
    "世界 🌍\n",
    "UTF-8 path and body round trip",
  );
  f.equal(
    [...await repo.content.readBytes("binary.bin")],
    [0, 128, 255],
    "Binary bytes remain exact",
  );
  f.equal(await repo.content.readText("empty.txt"), "", "Empty file is present");
  f.equal(await repo.content.readJson("config.json"), { ok: true }, "JSON body decoding");
  f.equal(
    (await repo.content.readBlob("config.json")).type,
    "application/json",
    "Blob MIME type",
  );
  const batch = await repo.content.readFiles(["empty.txt", "missing.txt", "nested", "empty.txt"]);
  f.equal(
    batch.map((r) => r.unavailable ?? "file"),
    ["file", "missing", "not-a-file", "file"],
    "Batch distinguishes missing files and directories",
  );
  const entries = await repo.content.listDirectory("", {
    recursive: true,
    maxDepth: 3,
    maxItems: 30,
  });
  f.assert(
    entries.some((e) => e.path === "nested/deep/file.txt"),
    "Bounded recursive tree traversal",
  );
  f.equal((await repo.content.getDirectory(".")).kind, "directory", "Root directory alias");
  const metadata = await repo.content.readPathMetadataBatch(["empty.txt"], {
    compareFirstParent: true,
  });
  f.assert(metadata[0].content?.lastCommitSha, "Path metadata includes latest modifying commit");
};
