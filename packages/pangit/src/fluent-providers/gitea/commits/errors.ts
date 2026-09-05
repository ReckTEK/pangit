import {
  ProviderInvariantError,
  ValidationError,
} from "../../../fluent-api/adapter-contract/errors.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaVersion } from "../native/GiteaEntityNative.ts";
import type { GiteaOperationIdentity } from "../transport/response/mod.ts";

export function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  message: string,
  cause?: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(message, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
    ...(cause === undefined ? {} : { cause }),
  });
}

export function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  message: string,
  cause?: unknown,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
    ...(cause === undefined ? {} : { cause }),
  });
}
