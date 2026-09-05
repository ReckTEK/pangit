import { OperationAbortedError } from "../../../../fluent-api/adapter-contract/errors.ts";
import { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import { mapGiteaBounded } from "./bounded-map.ts";

Deno.test("Gitea batches observe cancellation after the final worker", async () => {
  const context = new GiteaAdapterContext("1.27.2", { baseUrl: "https://provider.invalid" });
  const controller = new AbortController();
  try {
    await mapGiteaBounded(
      context,
      { universal: "readFiles" },
      [1],
      1,
      controller.signal,
      (value) => {
        controller.abort();
        return Promise.resolve(value);
      },
    );
    throw new Error("Aborted batch resolved");
  } catch (error) {
    if (!(error instanceof OperationAbortedError)) throw error;
  }
});
