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

import type { ForgejoAdapterContext } from "../ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../../native/ForgejoEntityNative.ts";
import { type ForgejoOperation, nativeOperation, universalOperation } from "./operation.ts";

import { header } from "./headers.ts";

/** Normalize a native Fetch response using the same status taxonomy as generated operations. */
export function throwForForgejoHttpResponse<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
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
export function normalizeForgejoThrown<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
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

export function errorFromResponse<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  result: AnyRestResponse,
): FluentOperationError {
  // Forgejo reports a well-formed but absent Git object as HTTP 400 from GetBlob.
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

export function errorContext<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  result: AnyRestResponse,
) {
  return {
    ...baseContext(context, operation, result),
    status: result.status,
    ...(header(result.headers, "x-request-id", "x-forgejo-request-id") === undefined
      ? {}
      : { requestId: header(result.headers, "x-request-id", "x-forgejo-request-id") }),
    ...(result.headers.get("retry-after") === null
      ? {}
      : { retryAfter: result.headers.get("retry-after")! }),
  } as const;
}

export function baseContext<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
  cause?: unknown,
) {
  return {
    provider: "forgejo" as const,
    version: context.version,
    operation: universalOperation(operation),
    ...(cause === undefined ? {} : { cause }),
  };
}

export function assertNotAborted<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  operation: ForgejoOperation,
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
