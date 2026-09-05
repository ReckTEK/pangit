import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoOperationIdentity } from "../transport/response/mod.ts";

export function invariant<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  message: string,
  cause?: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(message, {
    provider: "forgejo",
    version: context.version,
    operation: operation.universal,
    ...(cause === undefined ? {} : { cause }),
  });
}

export function validationError<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperationIdentity,
  message: string,
  cause?: unknown,
): ValidationError {
  return new ValidationError(message, {
    provider: "forgejo",
    version: context.version,
    operation: operation.universal,
    ...(cause === undefined ? {} : { cause }),
  });
}
