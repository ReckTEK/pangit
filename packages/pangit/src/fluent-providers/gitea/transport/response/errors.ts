import type { AnyRestResponse } from "../../../../generated-rest-clients/runtime/mod.ts";
import {
  AuthenticationError,
  ConflictError,
  FluentOperationError,
  NotFoundError,
  OperationAbortedError,
  PermissionDeniedError,
  ProviderOperationError,
  RateLimitError,
  ValidationError,
} from "../../../../fluent-api/adapter-contract/errors.ts";

import type { GiteaAdapterContext } from "../GiteaAdapterContext.ts";
import type { GiteaVersion } from "../../native/GiteaEntityNative.ts";
import { type GiteaOperation, nativeOperation, universalOperation } from "./operation.ts";

import { header } from "./headers.ts";

/** Normalize a native Fetch response using the same status taxonomy as generated operations. */
export function throwForGiteaHttpResponse<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  response: Response,
): void {
  if (response.ok) return;
  const result = {
    documented: false,
    ok: false,
    status: response.status,
    mediaType: response.headers.get("content-type") ?? undefined,
    body: undefined,
    headerValues: Object.freeze({}),
    headers: response.headers,
    response,
    operation: {
      id: nativeOperation(operation),
      method: "POST",
      path: response.url,
      responses: [],
    },
  } as const satisfies AnyRestResponse;
  throw errorFromResponse(context, operation, result);
}

/** Normalize a thrown native transport/cancellation failure. */
export function normalizeGiteaThrown<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  cause: unknown,
  signal?: AbortSignal,
): FluentOperationError {
  if (cause instanceof FluentOperationError) return cause;
  if (signal?.aborted || isAbortError(cause)) {
    return new OperationAbortedError(
      `${universalOperation(operation)} was aborted`,
      baseContext(context, operation, cause),
    );
  }
  return new ProviderOperationError(
    `${universalOperation(operation)} failed before receiving a provider response`,
    baseContext(context, operation, cause),
  );
}

export function errorFromResponse<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  result: AnyRestResponse,
): FluentOperationError {
  // Gitea reports a well-formed but absent Git object as HTTP 400 from GetBlob.
  // The adapter validates the object ID locally first, so this endpoint-specific response is
  // confirmed absence rather than caller validation failure.
  const missingBlob = result.status === 400 && nativeOperation(operation) === "GetBlob";
  const errorType = result.status === 401
    ? AuthenticationError
    : result.status === 403
    ? PermissionDeniedError
    : result.status === 404 || missingBlob
    ? NotFoundError
    : result.status === 405 || result.status === 409 || result.status === 412 ||
        result.status === 423
    ? ConflictError
    : result.status === 400 || result.status === 422
    ? ValidationError
    : result.status === 429
    ? RateLimitError
    : ProviderOperationError;
  return new errorType(
    `${universalOperation(operation)} failed with HTTP ${result.status}`,
    errorContext(context, operation, result),
  );
}

export function errorContext<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  result: AnyRestResponse,
) {
  return {
    ...baseContext(context, operation, result),
    status: result.status,
    ...(header(result.headers, "x-request-id", "x-gitea-request-id") === undefined
      ? {}
      : { requestId: header(result.headers, "x-request-id", "x-gitea-request-id") }),
    ...(result.headers.get("retry-after") === null
      ? {}
      : { retryAfter: result.headers.get("retry-after")! }),
  } as const;
}

export function baseContext<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  cause?: unknown,
) {
  return {
    provider: "gitea" as const,
    version: context.version,
    operation: universalOperation(operation),
    ...(cause === undefined ? {} : { cause }),
  };
}

export function assertNotAborted<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperation,
  signal?: AbortSignal,
): void {
  if (!signal?.aborted) return;
  throw new OperationAbortedError(
    `${universalOperation(operation)} was aborted`,
    baseContext(context, operation, signal.reason),
  );
}

export function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === "AbortError" ||
    value instanceof Error && value.name === "AbortError";
}
