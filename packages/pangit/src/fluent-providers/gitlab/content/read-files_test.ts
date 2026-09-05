import { ProviderOperationError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { Repo } from "../adapter.ts";
import { GitLabAdapterContext } from "../transport/GitLabAdapterContext.ts";
import { readFilesOperations } from "./read-files.ts";

Deno.test("GitLab failed file reads cancel sibling HTTP requests before returning", async () => {
  const caller = new AbortController();
  let unblock!: () => void;
  const slowStarted = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  let siblingAborted = false;
  let fallback = false;
  const paths: string[] = [];
  const context = new GitLabAdapterContext("19.3.1", {
    baseUrl: "https://provider.invalid/api/v4",
    async fetch(input, init) {
      const request = new Request(input, init);
      const path = new URL(request.url).searchParams.get("path")!;
      paths.push(path);
      if (path === "failed") {
        await slowStarted;
        return Response.json({ message: "unavailable" }, { status: 500 });
      }
      if (path !== "slow") throw new Error("Started queued work");
      unblock();
      return await new Promise<Response>((_resolve, reject) => {
        request.signal.addEventListener("abort", () => {
          siblingAborted = true;
          reject(request.signal.reason);
        }, { once: true });
      });
    },
  });
  const repository: Repo<"19.3.1"> = {
    id: "1",
    owner: "owner",
    name: "repo",
    fullName: "owner/repo",
    native: { gitlab: (): Promise<never> => Promise.reject(new Error("Unexpected native access")) },
  };
  const timer = setTimeout(() => {
    fallback = true;
    caller.abort();
  }, 1000);
  try {
    await readFilesOperations(context).readFiles(repository, [
      "failed/file",
      "slow/file",
      "queued/file",
    ], {
      ref: "a".repeat(40),
      concurrency: 2,
      signal: caller.signal,
    });
    throw new Error("Failed file batch resolved");
  } catch (error) {
    if (!(error instanceof ProviderOperationError) || error.status !== 500) throw error;
  } finally {
    clearTimeout(timer);
  }
  if (fallback || !siblingAborted || paths.join() !== "failed,slow") {
    throw new Error("Failed file batch did not promptly cancel its owned requests");
  }
});
