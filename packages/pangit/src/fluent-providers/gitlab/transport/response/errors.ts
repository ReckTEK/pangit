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

import type { GitLabAdapterContext } from "../GitLabAdapterContext.ts";
import type { GitLabVersion } from "../../native/GitLabNative.ts";
import { type GitLabOperation, nativeOperation, universalOperation } from "./operation.ts";

import { header } from "./headers.ts";

/** Normalize a native Fetch response using the same status taxonomy as generated operations. */
export function throwForGitLabHttpResponse<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
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
export function normalizeGitLabThrown<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
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

export function errorFromResponse<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  result: AnyRestResponse,
): FluentOperationError {
  const errorType = result.status === 401
    ? AuthenticationError
    : result.status === 403
    ? PermissionDeniedError
    : result.status === 404
    ? NotFoundError
    : result.status === 405 || result.status === 409 || result.status === 412 ||
        result.status === 423 || isFileGuardConflict(operation, result)
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

/** GitLab reports optimistic file conflicts as HTTP 400 rather than HTTP 409. */
function isFileGuardConflict(operation: GitLabOperation, result: AnyRestResponse): boolean {
  if (result.status !== 400 || universalOperation(operation) !== "commitFileChanges") return false;
  const body = result.body;
  return body !== null && typeof body === "object" && "message" in body &&
    typeof body.message === "string" &&
    body.message.startsWith("The file has changed since you started editing it:");
}

export function errorContext<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  result: AnyRestResponse,
) {
  return {
    ...baseContext(context, operation, result),
    status: result.status,
    ...(header(result.headers, "x-request-id", "x-gitlab-request-id") === undefined
      ? {}
      : { requestId: header(result.headers, "x-request-id", "x-gitlab-request-id") }),
    ...(result.headers.get("retry-after") === null
      ? {}
      : { retryAfter: result.headers.get("retry-after")! }),
  } as const;
}

export function baseContext<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  cause?: unknown,
) {
  return {
    provider: "gitlab" as const,
    version: context.version,
    operation: universalOperation(operation),
    ...(cause === undefined ? {} : { cause }),
  };
}

export function assertNotAborted<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
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
