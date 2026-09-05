import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { assertNotAborted } from "./response/errors.ts";

import { context, invalid } from "./errors.ts";

/** Bound batch work and preserve input order, including duplicates. */
export async function batch<T, R>(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  values: readonly T[],
  options: { maxItems?: number; concurrency?: number; signal?: AbortSignal },
  maximum: number,
  map: (v: T, signal: AbortSignal) => Promise<R>,
) {
  const bound = requirePositiveInteger(
    options.maxItems ?? maximum,
    "maxItems",
    context(c, operation),
  );
  const concurrency = Math.min(
    requirePositiveInteger(options.concurrency ?? 4, "concurrency", context(c, operation)),
    4,
  );
  if (values.length > bound) invalid(c, operation, "Batch exceeds maxItems");
  assertNotAborted(c, { universal: operation }, options.signal);
  const ownedAbort = new AbortController();
  const signal = options.signal === undefined
    ? ownedAbort.signal
    : AbortSignal.any([options.signal, ownedAbort.signal]);
  const result: R[] = new Array(values.length);
  let next = 0;
  let stopped = false;
  let failed = false;
  let failure: unknown;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (!stopped && next < values.length) {
      const index = next++;
      try {
        assertNotAborted(c, { universal: operation }, signal);
        result[index] = await map(values[index], signal);
        assertNotAborted(c, { universal: operation }, signal);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
          stopped = true;
          ownedAbort.abort(error);
        }
        return;
      }
    }
  }));
  if (failed) throw failure;
  return Object.freeze(result);
}
