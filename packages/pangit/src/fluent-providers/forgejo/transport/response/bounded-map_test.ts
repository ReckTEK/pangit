import { OperationAbortedError } from "../../../../fluent-api/adapter-contract/errors.ts";
import { ForgejoAdapterContext } from "../ForgejoAdapterContext.ts";
import { mapForgejoBounded } from "./bounded-map.ts";

Deno.test("Forgejo batches observe cancellation after the final worker", async () => {
  const context = new ForgejoAdapterContext("16.0.3", { baseUrl: "https://provider.invalid" });
  const controller = new AbortController();
  try {
    await mapForgejoBounded(
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
