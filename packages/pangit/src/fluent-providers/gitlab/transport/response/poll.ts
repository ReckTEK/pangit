import {
  OperationAbortedError,
  OperationTimeoutError,
  ValidationError,
} from "../../../../fluent-api/adapter-contract/errors.ts";
import { requirePositiveInteger } from "../../../../fluent-api/adapter-contract/operation-options.ts";
import type { GitLabAdapterContext } from "../GitLabAdapterContext.ts";
import type { GitLabVersion } from "../../native/GitLabNative.ts";
import { type GitLabOperation, universalOperation } from "./operation.ts";
import { assertNotAborted, baseContext } from "./errors.ts";

/** Poll only an explicitly known resource and fail at the caller-visible bound. */
export async function pollGitLab<TVersion extends GitLabVersion, TValue>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  options: {
    readonly attempts: number;
    readonly intervalMs: number;
    readonly signal?: AbortSignal;
  },
  read: (attempt: number) => Promise<TValue | undefined>,
): Promise<TValue> {
  const validationContext = baseContext(context, operation);
  requirePositiveInteger(options.attempts, "poll attempts", validationContext);
  if (!Number.isSafeInteger(options.intervalMs) || options.intervalMs < 0) {
    throw new ValidationError(
      "poll interval must be a non-negative safe integer",
      validationContext,
    );
  }
  for (let attempt = 1; attempt <= options.attempts; attempt++) {
    assertNotAborted(context, operation, options.signal);
    const value = await read(attempt);
    if (value !== undefined) return value;
    if (attempt < options.attempts) {
      await abortableDelay(context, operation, options.intervalMs, options.signal);
    }
  }
  throw new OperationTimeoutError(
    `${universalOperation(operation)} did not become ready within ${options.attempts} attempts`,
    baseContext(context, operation),
  );
}

async function abortableDelay<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  milliseconds: number,
  signal?: AbortSignal,
): Promise<void> {
  assertNotAborted(context, operation, signal);
  if (milliseconds === 0) return;
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, milliseconds);
      signal?.addEventListener("abort", () => {
        clearTimeout(timeout);
        reject(signal.reason);
      }, { once: true });
    });
  } catch (cause) {
    throw new OperationAbortedError(
      `${universalOperation(operation)} was aborted`,
      baseContext(context, operation, cause),
    );
  }
}
