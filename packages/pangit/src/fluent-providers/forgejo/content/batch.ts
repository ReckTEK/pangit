import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

import { validationContext } from "./validation.ts";
/** Content reads never fan out beyond this provider concurrency ceiling. */
export const FORGEJO_CONTENT_MAX_CONCURRENCY = 4;

export function boundedConcurrency<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  value?: number,
): number {
  const errorContext = validationContext(context, operation);
  const requested = requirePositiveInteger(
    value ?? FORGEJO_CONTENT_MAX_CONCURRENCY,
    "concurrency",
    errorContext,
  );
  if (requested > FORGEJO_CONTENT_MAX_CONCURRENCY) {
    throw new ValidationError(
      `concurrency cannot exceed ${FORGEJO_CONTENT_MAX_CONCURRENCY}`,
      errorContext,
    );
  }
  return requested;
}
