import { requirePositiveInteger } from "../../../../fluent-api/adapter-contract/operation-options.ts";
import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaVersion } from "../../native/GiteaEntityNative.ts";
import type { GiteaOperation } from "./operation.ts";
import { assertNotAborted, baseContext } from "./errors.ts";

/** Run independent reads with a fixed concurrency ceiling and stable output order. */
export async function mapGiteaBounded<
  TVersion extends GiteaVersion,
  TInput,
  TOutput,
>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  values: readonly TInput[],
  concurrency: number,
  signal: AbortSignal | undefined,
  map: (value: TInput, index: number, signal: AbortSignal) => Promise<TOutput>,
): Promise<readonly TOutput[]> {
  requirePositiveInteger(concurrency, "concurrency", baseContext(context, operation));
  assertNotAborted(context, operation, signal);
  const output = new Array<TOutput>(values.length);
  const ownedAbort = new AbortController();
  const effectiveSignal = signal === undefined
    ? ownedAbort.signal
    : AbortSignal.any([signal, ownedAbort.signal]);
  let next = 0;
  let stopped = false;
  let failed = false;
  let firstFailure: unknown;
  const worker = async () => {
    while (!stopped && next < values.length) {
      try {
        assertNotAborted(context, operation, effectiveSignal);
        const index = next++;
        output[index] = await map(values[index], index, effectiveSignal);
        assertNotAborted(context, operation, effectiveSignal);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstFailure = error;
          stopped = true;
          ownedAbort.abort(error);
        }
        return;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  if (failed) throw firstFailure;
  return Object.freeze(output);
}
