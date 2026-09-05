import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "../native/GitLabNative.ts";

import { context, invalid } from "./errors.ts";

/** Bound batch work and preserve input order, including duplicates. */
export async function batch<T, R>(
  c: GitLabAdapterContext<GitLabVersion>,
  operation: string,
  values: readonly T[],
  options: { maxItems?: number; concurrency?: number },
  maximum: number,
  map: (v: T) => Promise<R>,
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
  const result: R[] = new Array(values.length);
  let next = 0;
  let stopped = false;
  let failed = false;
  let failure: unknown;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (!stopped && next < values.length) {
      const index = next++;
      try {
        result[index] = await map(values[index]);
      } catch (error) {
        if (!failed) {
          failed = true;
          failure = error;
        }
        stopped = true;
      }
    }
  }));
  if (failed) throw failure;
  return Object.freeze(result);
}
