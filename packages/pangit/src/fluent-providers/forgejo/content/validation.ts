import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import { DEFAULT_CONTENT_BATCH_MAX_ITEMS } from "../../../fluent-api/adapter-contract/content.ts";

import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";

export function validateBatchPaths<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  paths: readonly string[],
  requestedMax?: number,
): readonly string[] {
  const maxItems = requirePositiveInteger(
    requestedMax ?? DEFAULT_CONTENT_BATCH_MAX_ITEMS,
    "maximum content items",
    validationContext(context, operation),
  );
  if (paths.length > maxItems) {
    throw validationError(
      context,
      operation,
      `requested ${paths.length} paths, exceeding the ${maxItems} item limit`,
    );
  }
  return Object.freeze(
    paths.map((path) =>
      requireIdentity(path, "content path", validationContext(context, operation))
    ),
  );
}

export function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

export function validationError<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  message: string,
): ValidationError {
  return new ValidationError(message, validationContext(context, operation));
}

export function validationContext<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
) {
  return {
    provider: "forgejo",
    version: context.version,
    operation,
  } as const;
}

export function invariant<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: string,
  message: string,
  cause?: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(message, {
    provider: "forgejo",
    version: context.version,
    operation,
    ...(cause === undefined ? {} : { cause }),
  });
}
