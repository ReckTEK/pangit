import { runContentReadContract } from "../../contracts/content/content-read-contract.ts";
import type { ForgejoContractCatalogEntry } from "../context.ts";
import { pngFixture } from "../png-fixture.ts";
export const runCoreContentReads: ForgejoContractCatalogEntry["run"] = async (t, context) => {
  const repository = await context.fixtures.createInitializedRepository("content");
  const linkedRepository = {
    owner: context.fixtures.currentUser,
    name: "e2e-links",
  };
  const submoduleSha = await context.fixtures.getFileSha(
    linkedRepository,
    "vendor/external",
    "main",
  );
  const text = { path: "text.txt", value: "hello from PanGit\n" };
  const binary = { path: "binary.bin", value: [0, 1, 2, 127, 128, 255] };
  const unicodeValue = "Hello, 世界 🌍 café\n";
  const json = { path: "config.json", value: { title: "世界 🌍", enabled: true, count: 2 } };
  const image = { path: "image.png", extensionlessPath: "image", bytes: [...pngFixture()] };
  const unknownBinaryPath = "unknown-content";
  const nestedPath = "nested/a.txt";
  const deepPath = "nested/deeper/b.txt";
  const parentRef = await context.fixtures.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "content tree fixture",
    changes: [
      { operation: "create", path: text.path, content: text.value },
      { operation: "create", path: binary.path, content: new Uint8Array(binary.value) },
      { operation: "create", path: "empty.txt", content: "" },
      { operation: "create", path: "unicodé-文件.txt", content: unicodeValue },
      { operation: "create", path: json.path, content: JSON.stringify(json.value) },
      { operation: "create", path: "invalid.json", content: "{not JSON}" },
      { operation: "create", path: image.path, content: new Uint8Array(image.bytes) },
      {
        operation: "create",
        path: image.extensionlessPath,
        content: new Uint8Array(image.bytes),
      },
      { operation: "create", path: unknownBinaryPath, content: new Uint8Array(binary.value) },
      { operation: "create", path: nestedPath, content: "parent\n" },
      { operation: "create", path: deepPath, content: "deep\n" },
      { operation: "create", path: "chain/one/two/file.txt", content: "chain\n" },
    ],
  });
  const nestedSha = await context.fixtures.getFileSha(repository, nestedPath, parentRef);
  const ref = await context.fixtures.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "content first-parent fixture",
    changes: [{
      operation: "update",
      path: nestedPath,
      content: "current\n",
      sha: nestedSha,
    }],
  });
  return await runContentReadContract(t, {
    provider: "forgejo",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      ref,
      branch: repository.defaultBranch,
      parentRef,
      text,
      binary,
      emptyPath: "empty.txt",
      unicodePath: "unicodé-文件.txt",
      unicodeValue,
      json,
      invalidJsonPath: "invalid.json",
      image,
      unknownBinaryPath,
      nestedDirectory: "nested",
      nestedPath,
      deepPath,
      chainDirectory: "chain",
      linkedContent: {
        repository: linkedRepository,
        ref: "main",
        symlinkPath: "link.txt",
        symlinkTarget: "target.txt",
        symlinkTargetValue: "symlink-target\n",
        submodulePath: "vendor/external",
        submoduleUrl: "https://example.invalid/external.git",
        internalSubmodulePath: "vendor/internal",
        internalSubmoduleUrl: `http://forgejo:3000/${context.username}/e2e-submodule.git`,
        submoduleSha,
      },
    },
  });
};
