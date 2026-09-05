import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { ConflictError } from "../../../fluent-api/adapter-contract/errors.ts";
import { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import { commitForgejoFileChanges } from "./commit-file-changes.ts";

for (const version of ["15.0.7", "16.0.3"] as const) {
  Deno.test(`Forgejo ${version} preserves binary moves and resolves upserts before one atomic write`, async () => {
    const sourceSha = "a".repeat(40);
    const reads: string[] = [];
    const mutations: { files: Record<string, unknown>[] }[] = [];
    const context = new ForgejoAdapterContext(version, {
      baseUrl: "https://forgejo.invalid/api/v1",
      async fetch(input, init) {
        const request = new Request(input, init);
        if (request.method === "POST") {
          mutations.push(await request.json());
          return Response.json({
            commit: { sha: "b".repeat(40), message: "atomic", parents: [{ sha: sourceSha }] },
          }, { status: 201 });
        }
        const path = new URL(request.url).pathname.split("/contents/")[1];
        reads.push(path);
        if (path === "new.txt") return Response.json({ message: "not found" }, { status: 404 });
        return Response.json({
          type: "file",
          name: path,
          path,
          sha: sourceSha,
          size: 3,
          encoding: "base64",
          content: "AP9B",
        });
      },
    });
    const repository = {
      id: "1",
      owner: "sandbox",
      name: "project",
      fullName: "sandbox/project",
      native: null as never,
    } satisfies RepositoryData<"forgejo", typeof version>;
    await commitForgejoFileChanges(context, repository, {
      branch: "main",
      message: "atomic",
      changes: [
        { operation: "move", fromPath: "source.bin", path: "destination.bin" },
        { operation: "upsert", path: "existing.txt", content: "changed" },
        { operation: "upsert", path: "new.txt", content: "new" },
      ],
    });
    const expected = [
      {
        operation: "update",
        path: "destination.bin",
        from_path: "source.bin",
        content: "AP9B",
        sha: sourceSha,
      },
      { operation: "update", path: "existing.txt", content: btoa("changed"), sha: sourceSha },
      { operation: "create", path: "new.txt", content: btoa("new") },
    ];
    if (mutations.length !== 1 || JSON.stringify(mutations[0].files) !== JSON.stringify(expected)) {
      throw new Error("atomic mutation lost bytes or source identity");
    }
    if (reads.length !== 3) throw new Error("mutation performed unrelated discovery");
    let conflict = false;
    try {
      await commitForgejoFileChanges(context, repository, {
        branch: "main",
        message: "stale",
        changes: [{
          operation: "update",
          path: "existing.txt",
          content: "unsafe",
          sha: "c".repeat(40),
        }],
      });
    } catch (error) {
      conflict = error instanceof ConflictError;
    }
    if (!conflict || mutations.length !== 1) throw new Error("stale source was overwritten");
  });
}
