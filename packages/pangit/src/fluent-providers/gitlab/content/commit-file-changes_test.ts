import { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import { commitFiles } from "./commit-file-changes.ts";
import type { Repo } from "../adapter.ts";
import { ConflictError } from "../../../fluent-api/adapter-contract/errors.ts";

for (const version of ["18.11.11", "19.3.1"] as const) {
  Deno.test(`GitLab ${version} preflights upserts and blob guards at the selected start SHA`, async () => {
    const startSha = "a".repeat(40);
    const blobSha = "b".repeat(40);
    const reads: string[] = [];
    const writes: { start_sha?: string; actions: { action: string; last_commit_id?: string }[] }[] =
      [];
    const context = new GitLabAdapterContext(version, {
      baseUrl: "https://gitlab.invalid",
      async fetch(input, init) {
        const request = new Request(input, init);
        const url = new URL(request.url);
        if (request.method === "POST") {
          writes.push(await request.json());
          return Response.json({ id: "c".repeat(40), message: "commit", parent_ids: [startSha] }, {
            status: 201,
          });
        }
        reads.push(url.searchParams.get("ref")!);
        if (url.pathname.endsWith("/new.txt")) {
          return Response.json({ message: "not found" }, { status: 404 });
        }
        return Response.json({ blob_id: blobSha, last_commit_id: startSha });
      },
    });
    const repo = {
      id: "1",
      owner: "owner",
      name: "repo",
      fullName: "owner/repo",
      native: null as never,
    } satisfies Repo<typeof version>;
    await commitFiles(context, repo, {
      branch: "main",
      newBranch: "from-history",
      message: "commit",
      changes: [
        { operation: "upsert", path: "new.txt", content: "new" },
        { operation: "update", path: "existing.txt", content: "updated", sha: blobSha },
      ],
    }, { extension: { startSha } });
    if (reads.length !== 2 || reads.some((ref) => ref !== startSha)) {
      throw new Error("Preflight read the current branch instead of the selected starting commit");
    }
    if (
      writes.length !== 1 || writes[0].start_sha !== startSha ||
      writes[0].actions.map(({ action }) => action).join() !== "create,update"
    ) {
      throw new Error("Atomic commit changed its source or file actions");
    }
    if (writes[0].actions.some((action) => action.last_commit_id !== undefined)) {
      throw new Error("Immutable start SHA must not apply a guard against the current branch");
    }

    let conflict = false;
    try {
      await commitFiles(context, repo, {
        branch: "main",
        newBranch: "stale-history",
        message: "stale",
        changes: [{
          operation: "update",
          path: "existing.txt",
          content: "bad",
          sha: "d".repeat(40),
        }],
      }, { extension: { startSha } });
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error;
      conflict = true;
    }
    if (!conflict || writes.length !== 1) {
      throw new Error("Stale historical blob guard wrote a commit");
    }

    await commitFiles(context, repo, {
      branch: "main",
      message: "guard mutable branch",
      changes: [{ operation: "update", path: "existing.txt", content: "updated", sha: blobSha }],
    });
    if (reads.at(-1) !== "main" || writes.at(-1)?.actions[0].last_commit_id !== startSha) {
      throw new Error("Mutable branch update lost its native concurrency guard");
    }
  });

  Deno.test(`GitLab ${version} reports server file guard failures as conflicts`, async () => {
    const context = new GitLabAdapterContext(version, {
      baseUrl: "https://gitlab.invalid",
      fetch: () =>
        Promise.resolve(Response.json({
          message: "The file has changed since you started editing it: existing.txt",
        }, { status: 400, headers: { "x-request-id": "guard-conflict" } })),
    });
    const repo = {
      id: "1",
      owner: "owner",
      name: "repo",
      fullName: "owner/repo",
      native: null as never,
    };
    try {
      await commitFiles(context, repo, {
        branch: "main",
        message: "concurrent update",
        changes: [{ operation: "update", path: "existing.txt", content: "updated" }],
      });
    } catch (error) {
      if (
        error instanceof ConflictError && error.status === 400 &&
        error.requestId === "guard-conflict" && error.cause !== undefined
      ) return;
      throw error;
    }
    throw new Error("Server file guard failure was accepted");
  });
}
