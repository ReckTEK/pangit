import type { AnyRestResponse } from "../../generated-rest-clients/runtime/mod.ts";
import {
  AuthenticationError,
  ConflictError,
  FluentOperationError,
  NotFoundError,
  OperationAbortedError,
  OperationTimeoutError,
  PermissionDeniedError,
  ProviderInvariantError,
  ProviderOperationError,
  RateLimitError,
  ValidationError,
} from "../../fluent-api/adapter-contract/errors.ts";
import { requirePositiveInteger } from "../../fluent-api/adapter-contract/operation-options.ts";
import type { GitLabAdapterContext } from "./GitLabAdapterContext.ts";
import type { GitLabVersion } from "./native/GitLabNative.ts";

export type GitLabSuccessResponse = AnyRestResponse & { readonly ok: true };

/** Stable fluent identity plus the native endpoint identity when they differ. */
export interface GitLabOperationIdentity {
  readonly universal: string;
  readonly native?: string;
}

/** Every provider-bound operation carries both stable fluent and native endpoint identity. */
export type GitLabOperation = GitLabOperationIdentity;

/** Run one generated operation and normalize every failure at the adapter boundary. */
export async function requestGitLab<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<GitLabSuccessResponse> {
  const result = await executeGitLab(context, operation, execute, signal);
  // GitLab's pinned schema omits documented success statuses on several endpoints (for
  // example commit creation is 201 in the REST docs but 200 in OpenAPI). Each caller
  // validates its actual response shape; generated documented flags remain untouched.
  return result as GitLabSuccessResponse;
}

/**
 * Read a documented provider raw-text mode whose conditional media type is absent from OpenAPI.
 * Status failures retain normal adapter mapping; only a successful text body is accepted.
 */
export async function requestGitLabText<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<string> {
  const result = await executeGitLab(context, operation, execute, signal);
  if (typeof result.body !== "string") {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed text success body`,
      errorContext(context, operation, result),
    );
  }
  return result.body;
}

/**
 * Read a complete raw file whose actual MIME type is more specific than OpenAPI's binary type.
 * The caller selects byte parsing on the generated operation; no text decoding may alter its body.
 */
export async function requestGitLabBytes<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<GitLabSuccessResponse & { readonly body: Uint8Array }> {
  const result = await executeGitLab(context, operation, execute, signal);
  if (result.status !== 200 || !(result.body instanceof Uint8Array)) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed or incomplete binary success body`,
      errorContext(context, operation, result),
    );
  }
  return result as GitLabSuccessResponse & { readonly body: Uint8Array };
}

/** Run one generated operation and return its body after optional shape validation. */
export async function requestGitLabBody<TBody, TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
  validate?: (value: unknown) => value is TBody,
): Promise<TBody> {
  const result = await requestGitLab(context, operation, execute, signal);
  if (validate !== undefined && !validate(result.body)) {
    throw new ProviderInvariantError(
      `${universalOperation(operation)} returned a malformed success body`,
      errorContext(context, operation, result),
    );
  }
  return result.body as TBody;
}

/** Convert only a confirmed provider 404 to absence. */
export async function requestOptionalGitLabBody<TBody, TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
  validate?: (value: unknown) => value is TBody,
): Promise<TBody | undefined> {
  try {
    return await requestGitLabBody(context, operation, execute, signal, validate);
  } catch (error) {
    if (error instanceof NotFoundError) return undefined;
    throw error;
  }
}

/** Opaque GitLab page state; provider page numbers never leak into the universal API. */
export interface GitLabPageCursor {
  readonly page: number;
  readonly effectiveLimit?: number;
}

export interface GitLabCursorValidationContext {
  readonly version?: GitLabVersion;
  readonly operation?: GitLabOperation;
}

export function decodeGitLabPageCursor(
  cursor?: string,
  context: GitLabCursorValidationContext = {},
): GitLabPageCursor {
  if (cursor === undefined) return Object.freeze({ page: 1 });
  const match = /^gitlab-page:(\d+)(?::(\d+))?$/.exec(cursor);
  const errorContext = cursorErrorContext(context, "decodePageCursor");
  if (match === null) {
    throw new ValidationError("invalid GitLab page cursor", errorContext);
  }
  return Object.freeze({
    page: requirePositiveInteger(Number(match[1]), "GitLab cursor page", errorContext),
    ...(match[2] === undefined ? {} : {
      effectiveLimit: requirePositiveInteger(
        Number(match[2]),
        "GitLab cursor limit",
        errorContext,
      ),
    }),
  });
}

export function encodeGitLabPageCursor(
  cursor: GitLabPageCursor,
  context: GitLabCursorValidationContext = {},
): string {
  const errorContext = cursorErrorContext(context, "encodePageCursor");
  requirePositiveInteger(cursor.page, "GitLab cursor page", errorContext);
  if (cursor.effectiveLimit !== undefined) {
    requirePositiveInteger(cursor.effectiveLimit, "GitLab cursor limit", errorContext);
  }
  return `gitlab-page:${cursor.page}${
    cursor.effectiveLimit === undefined ? "" : `:${cursor.effectiveLimit}`
  }`;
}

/** Read native GitLab pagination headers without trusting incomplete generated header maps. */
export function gitlabPagination<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  response: GitLabSuccessResponse,
  cursor: GitLabPageCursor,
  requestedLimit: number,
  itemCount: number,
): { readonly nextCursor?: string; readonly totalCount?: number } {
  const totalCount = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-total-count",
    "x-total",
  );
  const reportedPage = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-page",
  );
  const pageCount = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-total-pages",
  );
  const reportedLimit = parseFirstNonNegativeHeader(
    context,
    operation,
    response.headers,
    response,
    "x-per-page",
  );
  const hasMore = parseBooleanHeader(
    context,
    operation,
    response.headers,
    response,
    "x-hasmore",
  );
  const linkedPage = nextPageFromLink(response.headers.get("link"));
  const effectiveLimit = cursor.effectiveLimit ??
    (reportedLimit === undefined || reportedLimit === 0 ? undefined : reportedLimit) ??
    (itemCount > 0 && itemCount < requestedLimit && totalCount !== undefined &&
        totalCount > itemCount
      ? itemCount
      : requestedLimit);
  const consumed = (cursor.page - 1) * effectiveLimit + itemCount;
  const currentPage = reportedPage === undefined || reportedPage < 1 ? cursor.page : reportedPage;
  const explicitNext = response.headers.get("x-next-page");
  const nextPage = explicitNext === "" ? undefined : linkedPage ??
    (explicitNext !== null && /^\d+$/.test(explicitNext) && Number(explicitNext) > currentPage
      ? Number(explicitNext)
      : undefined) ??
    (hasMore === true
      ? currentPage + 1
      : hasMore === false
      ? undefined
      : pageCount !== undefined && currentPage < pageCount
      ? currentPage + 1
      : itemCount > 0 && totalCount !== undefined && consumed < totalCount
      ? cursor.page + 1
      : itemCount === effectiveLimit && totalCount === undefined && pageCount === undefined
      ? currentPage + 1
      : undefined);
  return Object.freeze({
    ...(nextPage === undefined ? {} : {
      nextCursor: encodeGitLabPageCursor(
        { page: nextPage, effectiveLimit },
        { version: context.version, operation },
      ),
    }),
    ...(totalCount === undefined ? {} : { totalCount }),
  });
}

/** Run independent reads with a fixed concurrency ceiling and stable output order. */
export async function mapGitLabBounded<
  TVersion extends GitLabVersion,
  TInput,
  TOutput,
>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  values: readonly TInput[],
  concurrency: number,
  signal: AbortSignal | undefined,
  map: (value: TInput, index: number, signal: AbortSignal) => Promise<TOutput>,
): Promise<readonly TOutput[]> {
  requirePositiveInteger(concurrency, "concurrency", baseContext(context, operation));
  assertNotAborted(context, operation, signal);
  const output = new Array<TOutput>(values.length);
  const ownedAbort = new AbortController();
  const effectiveSignal = signal === undefined
    ? ownedAbort.signal
    : AbortSignal.any([signal, ownedAbort.signal]);
  let next = 0;
  let stopped = false;
  let failed = false;
  let firstFailure: unknown;
  const worker = async () => {
    while (!stopped && next < values.length) {
      try {
        assertNotAborted(context, operation, effectiveSignal);
        const index = next++;
        output[index] = await map(values[index], index, effectiveSignal);
      } catch (error) {
        if (!failed) {
          failed = true;
          firstFailure = error;
          stopped = true;
          ownedAbort.abort(error);
        }
        return;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  if (failed) throw firstFailure;
  return Object.freeze(output);
}

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

async function executeGitLab<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  execute: () => Promise<AnyRestResponse>,
  signal?: AbortSignal,
): Promise<AnyRestResponse & { readonly ok: true }> {
  assertNotAborted(context, operation, signal);
  try {
    const result = await execute();
    if (!result.ok) throw errorFromResponse(context, operation, result);
    return result as AnyRestResponse & { readonly ok: true };
  } catch (cause) {
    if (cause instanceof FluentOperationError) throw cause;
    if (signal?.aborted || isAbortError(cause)) {
      throw new OperationAbortedError(
        `${universalOperation(operation)} was aborted`,
        baseContext(context, operation, cause),
      );
    }
    throw new ProviderOperationError(
      `${universalOperation(operation)} failed before receiving a provider response`,
      baseContext(context, operation, cause),
    );
  }
}

function errorFromResponse<TVersion extends GitLabVersion>(
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

function errorContext<TVersion extends GitLabVersion>(
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

function baseContext<TVersion extends GitLabVersion>(
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

function assertNotAborted<TVersion extends GitLabVersion>(
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

function isAbortError(value: unknown): boolean {
  return value instanceof DOMException && value.name === "AbortError" ||
    value instanceof Error && value.name === "AbortError";
}

function header(headers: Headers, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = headers.get(name);
    if (value !== null && value.length > 0) return value;
  }
  return undefined;
}

function parseFirstNonNegativeHeader<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  headers: Headers,
  response: GitLabSuccessResponse,
  ...names: readonly string[]
): number | undefined {
  let name: string | undefined;
  let raw: string | null = null;
  for (const candidate of names) {
    const value = headers.get(candidate);
    if (value !== null) {
      name = candidate;
      raw = value;
      break;
    }
  }
  if (name === undefined || raw === null) return undefined;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new ProviderInvariantError(
      `${response.operation.id} returned invalid ${name}`,
      {
        provider: "gitlab",
        version: context.version,
        operation: universalOperation(operation),
        status: response.status,
        cause: response,
      },
    );
  }
  return parsed;
}

function parseBooleanHeader<TVersion extends GitLabVersion>(
  context: GitLabAdapterContext<TVersion>,
  operation: GitLabOperation,
  headers: Headers,
  response: GitLabSuccessResponse,
  name: string,
): boolean | undefined {
  const raw = headers.get(name)?.toLowerCase();
  if (raw === undefined) return undefined;
  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;
  throw new ProviderInvariantError(`${response.operation.id} returned invalid ${name}`, {
    provider: "gitlab",
    version: context.version,
    operation: universalOperation(operation),
    status: response.status,
    cause: response,
  });
}

function nextPageFromLink(value: string | null): number | undefined {
  if (value === null) return undefined;
  for (const part of value.split(",")) {
    if (!/;\s*rel=(?:"next"|next)(?:;|$)/i.test(part)) continue;
    const target = /<([^>]+)>/.exec(part)?.[1];
    if (target === undefined) continue;
    try {
      const page = Number(new URL(target, "https://pangit.invalid/").searchParams.get("page"));
      if (Number.isSafeInteger(page) && page > 0) return page;
    } catch {
      continue;
    }
  }
  return undefined;
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

function universalOperation(operation: GitLabOperation): string {
  return operation.universal;
}

function nativeOperation(operation: GitLabOperation): string {
  return operation.native ?? operation.universal;
}

function cursorErrorContext(
  context: GitLabCursorValidationContext,
  fallbackOperation: string,
) {
  return {
    provider: "gitlab" as const,
    ...(context.version === undefined ? {} : { version: context.version }),
    operation: context.operation === undefined
      ? fallbackOperation
      : universalOperation(context.operation),
  };
}
