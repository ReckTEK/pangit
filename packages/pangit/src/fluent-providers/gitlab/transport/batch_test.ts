import { OperationAbortedError } from "../../../fluent-api/adapter-contract/errors.ts";
import { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import { batch } from "./batch.ts";

const context = new GitLabAdapterContext("19.3.1", { baseUrl: "https://provider.invalid" });

Deno.test("GitLab batches abort siblings and preserve the first failure", async () => {
  const failure = new Error("first failure");
  const started: number[] = [];
  let siblingAborted = false;
  let caught: unknown;
  try {
    await batch(
      context,
      "readFiles",
      [0, 1, 2],
      { concurrency: 2 },
      3,
      async (value, signal?: AbortSignal) => {
        started.push(value);
        if (value === 1) throw failure;
        if (!signal) throw new Error("Worker has no owned cancellation signal");
        await new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            siblingAborted = true;
            reject(signal.reason);
          }, { once: true });
        });
        return value;
      },
    );
  } catch (error) {
    caught = error;
  }
  if (caught !== failure || !siblingAborted || started.join() !== "0,1") {
    throw new Error("Batch lost the failure, retained siblings, or started queued work");
  }
});

Deno.test("GitLab batches observe cancellation before work and after the final worker", async () => {
  for (const alreadyAborted of [true, false]) {
    const controller = new AbortController();
    if (alreadyAborted) controller.abort();
    let called = false;
    const options = { signal: controller.signal, concurrency: 1 };
    try {
      await batch(context, "readFiles", [1], options, 1, (value) => {
        called = true;
        controller.abort();
        return Promise.resolve(value);
      });
      throw new Error("Aborted batch resolved");
    } catch (error) {
      if (!(error instanceof OperationAbortedError)) throw error;
    }
    if (alreadyAborted && called) throw new Error("Batch started after cancellation");
  }
});
