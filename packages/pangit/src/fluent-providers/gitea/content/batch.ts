import { ValidationError } from "../../../fluent-api/adapter-contract/errors.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";

import { validationContext } from "./validation.ts";
/** Content reads never fan out beyond this provider concurrency ceiling. */
export const GITEA_CONTENT_MAX_CONCURRENCY = 4;

export function chunk<T>(values: readonly T[], size: number): readonly (readonly T[])[] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

export function boundedConcurrency<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value?: number,
): number {
  const errorContext = validationContext(context, operation);
  const requested = requirePositiveInteger(
    value ?? GITEA_CONTENT_MAX_CONCURRENCY,
    "concurrency",
    errorContext,
  );
  if (requested > GITEA_CONTENT_MAX_CONCURRENCY) {
    throw new ValidationError(
      `concurrency cannot exceed ${GITEA_CONTENT_MAX_CONCURRENCY}`,
      errorContext,
    );
  }
  return requested;
}
