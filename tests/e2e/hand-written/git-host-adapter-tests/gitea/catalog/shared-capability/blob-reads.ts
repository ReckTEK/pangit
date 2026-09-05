import { runBlobReadContract } from "../../contracts/optional/blob-reads/blob-read-contract.ts";
import type { GiteaContractCatalogEntry } from "../context.ts";
import { pngFixture } from "../png-fixture.ts";
export const runSharedCapabilityBlobReads: GiteaContractCatalogEntry["run"] = async (
  t,
  context,
) => {
  const repository = await context.fixtures.createInitializedRepository("blob-reads");
  const bytes = new Uint8Array([0, 1, 2, 127, 128, 255]);
  const path = "known-blob.bin";
  const text = "Hello, 世界 🌍 café\n";
  const json = { title: "世界 🌍", enabled: true, count: 2 };
  const image = pngFixture();
  const ref = await context.fixtures.commitFiles(repository, {
    branch: repository.defaultBranch,
    message: "add known blob fixture",
    changes: [
      { operation: "create", path, content: bytes },
      { operation: "create", path: "text.txt", content: text },
      { operation: "create", path: "empty.txt", content: "" },
      { operation: "create", path: "config.json", content: JSON.stringify(json) },
      { operation: "create", path: "invalid.json", content: "{not JSON}" },
      { operation: "create", path: "image.png", content: image },
    ],
  });
  const sha = await context.fixtures.getFileSha(repository, path, ref);
  return await runBlobReadContract(t, {
    provider: "gitea",
    version: context.version,
    apiUrl: context.apiUrl,
    token: context.token,
    fixtures: {
      repository: { owner: repository.owner, name: repository.name },
      blob: { sha, bytes },
      text: { sha: await context.fixtures.getFileSha(repository, "text.txt", ref), value: text },
      emptySha: await context.fixtures.getFileSha(repository, "empty.txt", ref),
      json: {
        sha: await context.fixtures.getFileSha(repository, "config.json", ref),
        value: json,
      },
      invalidJsonSha: await context.fixtures.getFileSha(repository, "invalid.json", ref),
      image: {
        sha: await context.fixtures.getFileSha(repository, "image.png", ref),
        bytes: image,
      },
      missingSha: "ffffffffffffffffffffffffffffffffffffffff",
    },
  });
};
