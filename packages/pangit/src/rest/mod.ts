/** Shared native-Fetch transport used internally by generated REST clients. */
import {
  bindResponseToSignal,
  cancelRequestBody,
  preserveRequestCancellation,
  runAfterResponseHook,
  runBeforeRequestHook,
  runFetchWithSignal,
  runWithSignal,
  throwIfAborted,
} from "./lifecycle.ts";
import {
  appendHeaderValues,
  appendQuery,
  appendQueryEntries,
  interpolatePath,
  isAbsoluteUrl,
  joinUrl,
  mergeHeaders,
  serializeBody,
  snapshotQuery,
} from "./request.ts";
import { isMultipart } from "./media-type.ts";
import { decodeRestResponse, responseAcceptHeader } from "./response.ts";
import type {
  AnyRestResponse,
  RestClientOptions,
  RestHeadersProvider,
  RestOperation,
  RestOperationInput,
  RestRequestContext,
  RestRequestOperation,
  RestRequestOptions,
} from "./contracts.ts";

export type {
  AnyRestResponse,
  RestBinary,
  RestBody,
  RestClientOptions,
  RestGeneratedDecodeMode,
  RestGeneratedRequestOptions,
  RestHeadersProvider,
  RestHttpStatus,
  RestInt64,
  RestJsonData,
  RestJsonNumber,
  RestJsonValue,
  RestMethod,
  RestOperation,
  RestOperationInput,
  RestOperationResponse,
  RestParseMode,
  RestPathGroup,
  RestPathParameter,
  RestQueryParameter,
  RestRequestContext,
  RestRequestOperation,
  RestRequestOptions,
  RestRequestValue,
  RestResponse,
  RestSecurityRequirement,
  RestSuccessfulStatus,
  RestUndocumentedResponse,
} from "./contracts.ts";

export {
  isRestDocumentedSuccess,
  isRestSuccess,
  RestApiError,
  RestParseError,
  RestUndocumentedResponseError,
  unwrapRestResponse,
} from "./response.ts";
export type { RestDocumentedSuccess, RestDocumentedSuccessBody } from "./response.ts";

/** Deep-freeze generated plain metadata while preserving exact inferred literal types. */
export function deepFreezeRestMetadata<const TValue>(value: TValue): TValue {
  return deepFreezeGeneratedValue(value);
}

/** Deep-freeze generated operation registries while preserving their exact inferred keys. */
export function deepFreezeRestOperations<
  const TOperations extends Readonly<Record<string, RestOperation>>,
>(operations: TOperations): TOperations {
  return deepFreezeRestMetadata(operations);
}

/** A native Fetch transport failure with request and operation context. */
export class RestTransportError extends Error {
  readonly operation: RestRequestOperation;
  readonly request: Request;

  constructor(operation: RestRequestOperation, request: Request, cause: unknown) {
    super(`${operation.id} transport failed`, { cause });
    this.name = "RestTransportError";
    this.operation = operation;
    this.request = request;
  }
}

/** Shared native-Fetch transport used by every generated provider client. */
export class RestClient {
  readonly #baseUrl: URL;
  readonly #fetch: typeof globalThis.fetch;
  readonly #headers?: Headers | RestHeadersProvider;
  readonly #query?: readonly (readonly [string, string])[];
  readonly #beforeRequest?: RestClientOptions["beforeRequest"];
  readonly #afterResponse?: RestClientOptions["afterResponse"];
  readonly #throwOnError: boolean;
  readonly #useOperationServers: boolean;
  readonly #headerForwarding: "all" | "same-origin";

  constructor(options: RestClientOptions) {
    this.#baseUrl = new URL(options.baseUrl);
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#headers = typeof options.headers === "function"
      ? options.headers
      : options.headers === undefined
      ? undefined
      : new Headers(options.headers);
    this.#query = snapshotQuery(options.query);
    this.#beforeRequest = options.beforeRequest;
    this.#afterResponse = options.afterResponse;
    this.#throwOnError = options.throwOnError ?? false;
    this.#useOperationServers = options.useOperationServers ?? true;
    this.#headerForwarding = options.headerForwarding ?? "all";
  }

  /** A defensive copy of the configured provider API root. */
  get baseUrl(): URL {
    return new URL(this.#baseUrl);
  }

  /** Execute a generated operation and retain the parsed and native responses. */
  async request<TResponse extends AnyRestResponse>(
    operation: RestOperation,
    input: RestOperationInput = {},
    options: RestRequestOptions = {},
  ): Promise<TResponse> {
    const {
      baseUrl,
      body: bodyOverride,
      headers: optionHeaders,
      mediaType: mediaTypeOverride,
      parseAs = "auto",
      query: optionQuery,
      throwOnError = this.#throwOnError,
      ...requestInit
    } = options;
    const signal = requestInit.signal ?? undefined;
    throwIfAborted(signal);

    const operationBaseUrl = baseUrl === undefined
      ? this.#operationBaseUrl(operation)
      : new URL(baseUrl);
    const path = interpolatePath(operation, input.path, input.pathGroups);
    const url = joinUrl(operationBaseUrl, path);
    appendQueryEntries(url, this.#query);
    appendQuery(url, input.query, operation.queryParameters);
    appendQuery(url, optionQuery);
    const context: RestRequestContext = Object.freeze(
      signal === undefined ? { url: url.href } : { signal, url: url.href },
    );

    const headers = new Headers();
    appendHeaderValues(headers, input.headers);

    throwIfAborted(signal);
    const generatedBody = input.body === undefined ? undefined : serializeBody(input.body);
    const body = bodyOverride === undefined ? generatedBody : bodyOverride;
    const mediaType = mediaTypeOverride ?? input.body?.mediaType;
    if (mediaType !== undefined && !isMultipart(mediaType) && !headers.has("content-type")) {
      headers.set("content-type", mediaType);
    }

    const accept = responseAcceptHeader(operation);
    if (accept !== undefined && !headers.has("accept")) {
      headers.set("accept", accept);
    }
    mergeHeaders(headers, optionHeaders);

    const request = new Request(url, {
      ...requestInit,
      body,
      headers,
      method: operation.method,
    });
    const { response, signal: downstreamSignal } = await this.#dispatch(
      request,
      operation,
      context,
    );
    return await decodeRestResponse<TResponse>(
      operation,
      response,
      parseAs,
      throwOnError,
      downstreamSignal,
    );
  }

  /**
   * Execute an arbitrary provider request through the configured transport and hooks.
   * This is the lowest-level escape hatch when an upstream specification is incomplete or needs
   * provider-specific raw URL handling. Native URL normalization still cannot represent literal
   * `.` or `..` path segments; use an alternate encoding only when the provider defines one.
   */
  async fetch(path: string | URL, init: RequestInit = {}): Promise<Response> {
    const signal = init.signal ?? undefined;
    throwIfAborted(signal);
    const method = init.method?.toUpperCase() ?? "GET";
    const operation: RestRequestOperation = {
      id: `raw:${method}`,
      method,
      path: typeof path === "string" ? path : path.pathname,
      responses: [],
    };
    const url = path instanceof URL || isAbsoluteUrl(path)
      ? new URL(path)
      : joinUrl(this.#baseUrl, path);
    appendQueryEntries(url, this.#query);
    const context: RestRequestContext = Object.freeze(
      signal === undefined ? { url: url.href } : { signal, url: url.href },
    );
    const headers = new Headers();
    mergeHeaders(headers, init.headers);

    const request = new Request(url, { ...init, headers, method });
    const { response, signal: downstreamSignal } = await this.#dispatch(
      request,
      operation,
      context,
    );
    return bindResponseToSignal(response, downstreamSignal);
  }

  /** Shared hook/header/Fetch ordering for generated operations and the raw escape hatch. */
  async #dispatch(
    request: Request,
    operation: RestRequestOperation,
    context: RestRequestContext,
  ): Promise<{ response: Response; signal: AbortSignal }> {
    const signal = context.signal;
    if (this.#beforeRequest !== undefined) {
      request = await runBeforeRequestHook(
        request,
        () => this.#beforeRequest!(request, operation, context),
        signal,
      );
      request = preserveRequestCancellation(request, signal);
    }
    const downstreamSignal = request.signal;
    const downstreamContext: RestRequestContext = Object.freeze({
      signal: downstreamSignal,
      url: request.url,
    });
    await this.#applyConfiguredHeaders(request, operation, downstreamContext);

    let response = await this.#send(request, operation, downstreamSignal);
    if (this.#afterResponse !== undefined) {
      response = await runAfterResponseHook(
        response,
        () => this.#afterResponse!(response, request, operation, downstreamContext),
        downstreamSignal,
      );
    }
    return { response, signal: downstreamSignal };
  }

  async #send(
    request: Request,
    operation: RestRequestOperation,
    signal: AbortSignal | undefined,
  ): Promise<Response> {
    try {
      return await runFetchWithSignal(request, () => this.#fetch(request), signal);
    } catch (cause) {
      throwIfAborted(signal);
      if (cause instanceof RestTransportError) throw cause;
      throw new RestTransportError(operation, request, cause);
    }
  }

  #operationBaseUrl(operation: RestOperation): URL {
    if (!this.#useOperationServers || operation.server === undefined) {
      return new URL(this.#baseUrl);
    }
    if (operation.server.startsWith("//")) {
      return new URL(`${this.#baseUrl.protocol}${operation.server}`);
    }
    if (isAbsoluteUrl(operation.server)) {
      return new URL(operation.server);
    }
    return new URL(this.#baseUrl);
  }

  async #applyConfiguredHeaders(
    request: Request,
    operation: RestRequestOperation,
    context: RestRequestContext,
  ): Promise<void> {
    if (
      this.#headers === undefined ||
      (this.#headerForwarding === "same-origin" &&
        new URL(request.url).origin !== this.#baseUrl.origin)
    ) {
      return;
    }
    let configured: Headers;
    try {
      configured = typeof this.#headers === "function"
        ? new Headers(
          await runWithSignal(
            () => (this.#headers as RestHeadersProvider)(operation, context),
            context.signal,
          ),
        )
        : new Headers(this.#headers);
    } catch (error) {
      cancelRequestBody(request, context.signal?.aborted ? context.signal.reason : error);
      throw error;
    }
    configured.forEach((value, name) => {
      if (!request.headers.has(name)) request.headers.set(name, value);
    });
  }
}

function deepFreezeGeneratedValue<T>(value: T, seen = new WeakSet<object>()): T {
  if (!Array.isArray(value) && !isPlainObject(value)) return value;
  if (seen.has(value)) return value;
  seen.add(value);
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    deepFreezeGeneratedValue(child, seen);
  }
  Object.freeze(value);
  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
