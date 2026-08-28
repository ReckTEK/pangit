/** An HTTP method represented by the normalized provider specifications. */
export type RestMethod = "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";

/** Buffered binary data accepted by generated request models. Raw requests still accept streams. */
export type RestBinary =
  | ArrayBuffer
  | Blob
  | Uint8Array;

/**
 * A JSON number. Unsafe integral tokens up to 10,000 expanded decimal digits become bigint;
 * larger integral tokens and lossy non-integral tokens are rejected.
 */
export type RestJsonNumber = number | bigint;

const REST_JSON_MAX_INTEGER_DIGITS = 10_000;

/** An OpenAPI `int64` value. */
export type RestInt64 = RestJsonNumber;

/** Strict recursive JSON request data, with exact integral values represented by bigint. */
export type RestJsonData =
  | RestJsonNumber
  | string
  | boolean
  | null
  | readonly RestJsonData[]
  | { readonly [key: string]: RestJsonData | undefined };

/** Projects generated schema values onto their JSON wire representation. */
export type RestJsonValue<T> = unknown extends T ? RestJsonData
  : T extends RestBinary ? string
  : T extends RestInt64 ? T
  : T extends readonly unknown[] ? { [TKey in keyof T]: RestJsonValue<T[TKey]> }
  : T extends object ? { [TKey in keyof T]: RestJsonValue<T[TKey]> }
  : T;

type RestIfEqual<TLeft, TRight, TEqual, TDifferent> =
  (<TValue>() => TValue extends TLeft ? 1 : 2) extends (<TValue>() => TValue extends TRight ? 1 : 2)
    ? TEqual
    : TDifferent;

type RestWritableObject<TValue> =
  & {
    [
      TKey in keyof TValue as RestIfEqual<
        { [TCurrent in TKey]: TValue[TCurrent] },
        { -readonly [TCurrent in TKey]: TValue[TCurrent] },
        TKey,
        never
      >
    ]: RestRequestValue<TValue[TKey]>;
  }
  & {
    [
      TKey in keyof TValue as RestIfEqual<
        { [TCurrent in TKey]: TValue[TCurrent] },
        { -readonly [TCurrent in TKey]: TValue[TCurrent] },
        never,
        TKey
      >
    ]?: never;
  };

/** Projects a schema onto request-writable fields, recursively excluding OpenAPI read-only data. */
export type RestRequestValue<T> = T extends RestBinary | RestInt64 | string | boolean | null ? T
  : T extends readonly unknown[] ? { [TKey in keyof T]: RestRequestValue<T[TKey]> }
  : T extends object ? RestWritableObject<T>
  : T;

/** A media-type-tagged request body generated from an OpenAPI request body. */
export type RestBody<TMediaType extends string, TValue> = {
  mediaType: TMediaType;
  value: TValue;
};

export type RestPathParameter = {
  name: string;
  multiSegment?: boolean;
};

/** A parameter-dependent substring of a generated provider route. */
export type RestPathGroup = {
  /** Inclusive UTF-16 offset in `RestOperation.path`. */
  start: number;
  /** Exclusive UTF-16 offset in `RestOperation.path`. */
  end: number;
  /** Values which must either all be present or all be absent. */
  parameters?: readonly string[];
  /** Generated selector for a literal-only optional provider route group. */
  selector?: string;
  /** Selection used when a literal-only group selector is omitted. */
  defaultIncluded?: boolean;
};

export type RestQueryParameter = {
  name: string;
  style?: "form" | "spaceDelimited" | "pipeDelimited" | "deepObject";
  explode?: boolean;
  allowReserved?: boolean;
};

export type RestOperationResponse = {
  status: number | "default";
  mediaTypes: readonly string[];
  /** Generated decoder selection keyed by declared response media type. */
  decoders?: Readonly<Record<string, RestGeneratedDecodeMode>>;
  /** Generated response header names retained in the typed response envelope. */
  headers?: readonly string[];
};

/** Provider-native OpenAPI security requirement: scheme name to required scopes. */
export type RestSecurityRequirement = Readonly<Record<string, readonly string[]>>;

/** Decoder modes emitted from generated response media metadata. */
export type RestGeneratedDecodeMode = "binary" | "json" | "text";

/** Runtime metadata emitted beside every generated operation. */
export type RestOperation = {
  id: string;
  method: RestMethod;
  path: string;
  server?: string;
  pathParameters?: readonly RestPathParameter[];
  pathGroups?: readonly RestPathGroup[];
  queryParameters?: readonly RestQueryParameter[];
  requestMediaTypes?: readonly string[];
  responses: readonly RestOperationResponse[];
  /** Effective operation security. Undefined means unspecified; [] explicitly disables auth. */
  security?: readonly RestSecurityRequirement[];
};

/** Operation context passed through request hooks, including arbitrary raw Fetch methods. */
export type RestRequestOperation = Omit<RestOperation, "method"> & {
  method: string;
};

export type RestOperationInput = {
  path?: Readonly<Record<string, unknown>>;
  pathGroups?: Readonly<Record<string, boolean>>;
  query?: Readonly<Record<string, unknown>>;
  headers?: Readonly<Record<string, unknown>>;
  body?: RestBody<string, unknown>;
};

type RestStatusDigit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Status values exposed by Fetch: opaque status 0 plus HTTP 100 through 599. */
export type RestHttpStatus =
  | 0
  | (
    `${1 | 2 | 3 | 4 | 5}${RestStatusDigit}${RestStatusDigit}` extends
      `${infer TStatus extends number}` ? TStatus : never
  );

/** Fetch status values for which `Response.ok` is true. */
export type RestSuccessfulStatus = `${2}${RestStatusDigit}${RestStatusDigit}` extends
  `${infer TStatus extends number}` ? TStatus
  : never;

/** A response described by the provider's OpenAPI document. */
export type RestResponse<
  TStatus extends number,
  TBody,
  TMediaType extends string | undefined,
  TOk extends boolean,
  THeaderValues extends Readonly<Record<string, string | undefined>> = Readonly<
    Record<string, never>
  >,
> = {
  documented: true;
  ok: TOk;
  status: TStatus;
  mediaType: TMediaType;
  body: TBody;
  headerValues: THeaderValues;
  headers: Headers;
  /** Native response; generated decoding consumes its body, while raw parse modes transfer it. */
  response: Response;
  operation: RestOperation;
};

/** A response status or media type that was absent from the upstream specification. */
export type RestUndocumentedResponse = {
  documented: false;
  ok: boolean;
  status: number;
  mediaType: string | undefined;
  body: unknown;
  headerValues: Readonly<Record<string, string>>;
  headers: Headers;
  response: Response;
  operation: RestOperation;
};

export type AnyRestResponse =
  | RestResponse<
    number,
    unknown,
    string | undefined,
    boolean,
    Readonly<Record<string, string | undefined>>
  >
  | RestUndocumentedResponse;

export type RestParseMode =
  | "arrayBuffer"
  | "auto"
  | "blob"
  | "bytes"
  | "json"
  | "none"
  | "response"
  | "stream"
  | "text";

export type RestRequestOptions = Omit<RequestInit, "body" | "headers" | "method"> & {
  /** Override the client or operation base URL for this request. */
  baseUrl?: string | URL;
  /** Override the generated request body. */
  body?: BodyInit | null;
  /** Additional or overriding request headers. */
  headers?: HeadersInit;
  /** Content type for an overridden body. */
  mediaType?: string;
  /** Override automatic response parsing. `stream` returns a caller-owned, signal-bound stream. */
  parseAs?: RestParseMode;
  /** Additional query values not declared by the specification. */
  query?: Readonly<Record<string, unknown>>;
  /** Override the client's HTTP-error behavior. */
  throwOnError?: boolean;
};

/** Request options exposed by generated methods, which retain their generated response body type. */
export type RestGeneratedRequestOptions = Omit<RestRequestOptions, "parseAs"> & {
  readonly parseAs?: never;
};

type MaybePromise<T> = Promise<T> | T;

/** Immutable context shared across request authentication and lifecycle hooks. */
export type RestRequestContext = {
  readonly signal?: AbortSignal;
  readonly url: string;
};

export type RestHeadersProvider = (
  operation: RestRequestOperation,
  context: RestRequestContext,
) => MaybePromise<HeadersInit | undefined>;

export type RestClientOptions = {
  /** Provider API root, including any required path prefix such as `/api/v1`. */
  baseUrl: string | URL;
  /**
   * Default headers or a lazy provider applied to the final request target after beforeRequest.
   * Existing per-request and hook-added headers take precedence.
   */
  headers?: HeadersInit | RestHeadersProvider;
  /** Query values included with every request. */
  query?: Readonly<Record<string, unknown>>;
  /** Injectable Fetch implementation for custom transports and tests. */
  fetch?: typeof globalThis.fetch;
  /** Transform or replace a native Request before configured/lazy default headers are applied. */
  beforeRequest?: (
    request: Request,
    operation: RestRequestOperation,
    context: RestRequestContext,
  ) => MaybePromise<Request>;
  /** Observe or replace the native Response before parsing. */
  afterResponse?: (
    response: Response,
    request: Request,
    operation: RestRequestOperation,
    context: RestRequestContext,
  ) => MaybePromise<Response>;
  /** Throw RestApiError for non-2xx responses instead of returning their typed union member. */
  throwOnError?: boolean;
  /** Honor absolute operation-level servers such as GitHub's uploads endpoint. */
  useOperationServers?: boolean;
  /** Forward configured/lazy headers to all final targets or only the configured base origin. */
  headerForwarding?: "all" | "same-origin";
};

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

/** An HTTP error containing both the native Response and parsed generated response. */
export class RestApiError<TResponse extends AnyRestResponse = AnyRestResponse> extends Error {
  readonly result: TResponse;

  constructor(result: TResponse) {
    super(`${result.operation.id} failed with HTTP ${result.status}`);
    this.name = "RestApiError";
    this.result = result;
  }
}

/** A successful response that cannot be represented by the generated response contract. */
export class RestUndocumentedResponseError<
  TResponse extends RestUndocumentedResponse = RestUndocumentedResponse,
> extends Error {
  readonly result: TResponse;

  constructor(result: TResponse) {
    super(`${result.operation.id} returned undocumented HTTP ${result.status}`);
    this.name = "RestUndocumentedResponseError";
    this.result = result;
  }
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

/** A response whose bytes could not be decoded using the selected response decoder. */
export class RestParseError extends Error {
  readonly operation: RestOperation;
  readonly response: Response;
  readonly mediaType: string | undefined;
  readonly decodeAs: RestGeneratedDecodeMode | Exclude<RestParseMode, "auto">;

  constructor(
    operation: RestOperation,
    response: Response,
    mediaType: string | undefined,
    decodeAs: RestGeneratedDecodeMode | Exclude<RestParseMode, "auto">,
    cause: unknown,
  ) {
    super(`${operation.id} could not decode HTTP ${response.status} response as ${decodeAs}`, {
      cause,
    });
    this.name = "RestParseError";
    this.operation = operation;
    this.response = response;
    this.mediaType = mediaType;
    this.decodeAs = decodeAs;
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

    let request = new Request(url, {
      ...requestInit,
      body,
      headers,
      method: operation.method,
    });
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
    if (parseAs === "response" || parseAs === "none") {
      response = bindResponseToSignal(response, downstreamSignal);
    }

    const noContent = operation.method === "HEAD" || response.status === 204 ||
      response.status === 205;
    const actualMediaType = noContent ? undefined : responseMediaType(response);
    let match = matchDocumentedResponse(operation, response.status, actualMediaType);
    const decodeAs = noContent
      ? "none"
      : parseAs === "auto"
      ? match.decodeAs ?? inferResponseDecodeMode(actualMediaType)
      : parseAs;
    let parsedBody: unknown;
    try {
      if (
        !noContent && parseAs === "auto" && match.documented && decodeAs === "none" &&
        response.body !== null
      ) {
        const bytes = await readResponseBytes(response.body, downstreamSignal);
        if (bytes.byteLength === 0) {
          parsedBody = undefined;
        } else {
          match = { documented: false };
          parsedBody = new TextDecoder().decode(bytes);
        }
      } else {
        parsedBody = await parseResponseBody(response, decodeAs, downstreamSignal);
      }
    } catch (cause) {
      throwIfAborted(downstreamSignal);
      throw new RestParseError(
        operation,
        response,
        match.mediaType ?? actualMediaType,
        decodeAs,
        cause,
      );
    }
    const result = {
      documented: match.documented,
      ok: response.ok,
      status: response.status,
      mediaType: match.documented ? match.mediaType : actualMediaType,
      body: parsedBody,
      headerValues: responseHeaderValues(
        response.headers,
        match.documented ? match.headerNames ?? [] : undefined,
      ),
      headers: response.headers,
      response,
      operation,
    } as TResponse;

    if (throwOnError && !response.ok) {
      throw new RestApiError(result);
    }
    return result;
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

    let request = new Request(url, { ...init, headers, method });
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
    return bindResponseToSignal(response, downstreamSignal);
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

/** Narrow a generated response union to successful responses. */
export function isRestSuccess<TResponse extends AnyRestResponse>(
  result: TResponse,
): result is TResponse & { ok: true } {
  return result.ok;
}

/** Documented successful members of a generated response union. */
export type RestDocumentedSuccess<TResponse extends AnyRestResponse> = TResponse extends
  { documented: true; ok: infer TOk extends boolean }
  ? true extends TOk ? TResponse & { ok: true } : never
  : never;

/** Narrow a generated response union to a documented successful response. */
export function isRestDocumentedSuccess<TResponse extends AnyRestResponse>(
  result: TResponse,
): result is RestDocumentedSuccess<TResponse> {
  return result.documented && result.ok;
}

export type RestDocumentedSuccessBody<TResponse extends AnyRestResponse> =
  RestDocumentedSuccess<TResponse> extends infer TSuccess
    ? TSuccess extends { body: infer TBody } ? TBody : never
    : never;

/** Return a documented successful response body or throw a typed response error. */
export function unwrapRestResponse<TResponse extends AnyRestResponse>(
  result: TResponse,
): RestDocumentedSuccessBody<TResponse> {
  if (!result.ok) {
    throw new RestApiError(result);
  }
  if (!result.documented) {
    throw new RestUndocumentedResponseError(result);
  }
  return result.body as RestDocumentedSuccessBody<TResponse>;
}

function interpolatePath(
  operation: RestOperation,
  values: Readonly<Record<string, unknown>> | undefined,
  groupSelections: Readonly<Record<string, boolean>> | undefined,
): string {
  const parameters = new Map(
    operation.pathParameters?.map((parameter) => [parameter.name, parameter]),
  );
  let path = operation.path;
  const groups = [...operation.pathGroups ?? []].toSorted((left, right) =>
    right.start - left.start || right.end - left.end
  );
  const selectors = new Set(
    groups.flatMap((group) => group.selector === undefined ? [] : [group.selector]),
  );
  for (const selector of Object.keys(groupSelections ?? {}).toSorted()) {
    if (!selectors.has(selector)) {
      throw new TypeError(`${operation.id} has no optional path group selector ${selector}`);
    }
  }
  let followingStart = operation.path.length;
  for (const group of groups) {
    const groupParameters = group.parameters ?? [];
    const parameterized = groupParameters.length > 0;
    const selectable = group.selector !== undefined && groupParameters.length === 0 &&
      typeof group.defaultIncluded === "boolean";
    if (
      !Number.isInteger(group.start) || !Number.isInteger(group.end) || group.start < 0 ||
      group.end <= group.start || group.end > operation.path.length || group.end > followingStart ||
      parameterized === selectable
    ) {
      throw new TypeError(`${operation.id} has invalid optional path group metadata`);
    }
    followingStart = group.start;
    if (selectable) {
      const selected = groupSelections?.[group.selector!];
      if (selected !== undefined && typeof selected !== "boolean") {
        throw new TypeError(
          `${operation.id} optional path group selector ${group.selector} must be boolean`,
        );
      }
      if ((selected ?? group.defaultIncluded) === false) {
        path = `${path.slice(0, group.start)}${path.slice(group.end)}`;
      }
      continue;
    }
    const present = groupParameters.map((name) => {
      const value = values?.[name];
      return value !== undefined && value !== null;
    });
    const presentCount = present.filter(Boolean).length;
    if (presentCount !== 0 && presentCount !== present.length) {
      throw new TypeError(
        `${operation.id} optional path group requires all parameters together: ${
          groupParameters.join(", ")
        }`,
      );
    }
    if (presentCount === 0) {
      path = `${path.slice(0, group.start)}${path.slice(group.end)}`;
    }
  }
  return path.replaceAll(/\{([^}]+)\}/g, (_placeholder, name: string) => {
    const value = values?.[name];
    if (value === undefined || value === null) {
      throw new TypeError(`${operation.id} requires path parameter ${name}`);
    }
    const serialized = serializePrimitive(value);
    if (serialized === "") {
      throw new TypeError(
        `${operation.id} path parameter ${name} serializes to an empty path segment`,
      );
    }
    const multiSegment = parameters.get(name)?.multiSegment ?? false;
    const segments = multiSegment ? serialized.split("/") : [serialized];
    if (multiSegment && segments.some((segment) => segment === "")) {
      throw new TypeError(
        `${operation.id} path parameter ${name} contains an empty multi-segment component; ` +
          "native generated routing cannot preserve empty path components",
      );
    }
    const dotSegment = segments.find((segment) => segment === "." || segment === "..");
    if (dotSegment !== undefined) {
      throw new TypeError(
        `${operation.id} path parameter ${name} contains unsupported dot-only segment ${dotSegment}; ` +
          "native URL normalization cannot represent literal dot-only path segments",
      );
    }
    return multiSegment ? segments.map(encodePathSegment).join("/") : encodePathSegment(serialized);
  });
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replaceAll(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function joinUrl(baseUrl: URL, path: string): URL {
  const url = new URL(baseUrl);
  const relative = new URL(path, "https://rest.invalid");
  const basePath = url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "");
  const operationPath = relative.pathname.startsWith("/")
    ? relative.pathname
    : `/${relative.pathname}`;
  url.pathname = `${basePath}${operationPath}`.replaceAll(/\/{2,}/g, "/");
  relative.searchParams.forEach((value, name) => url.searchParams.append(name, value));
  url.hash = relative.hash;
  return url;
}

function appendQuery(
  url: URL,
  values: Readonly<Record<string, unknown>> | undefined,
  definitions: readonly RestQueryParameter[] = [],
): void {
  if (values === undefined) {
    return;
  }
  const definitionByName = new Map(definitions.map((definition) => [definition.name, definition]));
  for (const name of Object.keys(values).sort()) {
    const value = values[name];
    if (value === undefined) {
      continue;
    }
    appendQueryValue(url.searchParams, name, value, definitionByName.get(name));
  }
}

function snapshotQuery(
  values: Readonly<Record<string, unknown>> | undefined,
): readonly (readonly [string, string])[] | undefined {
  if (values === undefined) return undefined;
  const url = new URL("https://rest.invalid");
  appendQuery(url, values);
  return Object.freeze(
    [...url.searchParams.entries()].map(([name, value]) => Object.freeze([name, value] as const)),
  );
}

function appendQueryEntries(
  url: URL,
  entries: readonly (readonly [string, string])[] | undefined,
): void {
  for (const [name, value] of entries ?? []) {
    url.searchParams.append(name, value);
  }
}

function appendQueryValue(
  query: URLSearchParams,
  name: string,
  value: unknown,
  definition: RestQueryParameter | undefined,
): void {
  if (definition?.allowReserved) {
    throw new TypeError(`Query parameter ${name} uses unsupported allowReserved serialization`);
  }
  if (definition?.style === "deepObject") {
    if (!isRecord(value)) {
      throw new TypeError(`Deep-object query parameter ${name} must be an object`);
    }
    for (
      const [key, item] of Object.entries(value).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    ) {
      if (Array.isArray(item) || isRecord(item)) {
        throw new TypeError(`Deep-object query parameter ${name}.${key} must be primitive`);
      }
      if (item !== undefined) query.append(`${name}[${key}]`, serializePrimitive(item));
    }
    return;
  }
  const separator = definition?.style === "spaceDelimited"
    ? " "
    : definition?.style === "pipeDelimited"
    ? "|"
    : ",";
  const explode = definition?.explode ?? (definition?.style ?? "form") === "form";

  if (Array.isArray(value)) {
    if (explode) {
      for (const item of value) {
        query.append(name, serializePrimitive(item));
      }
    } else {
      query.append(name, value.map(serializePrimitive).join(separator));
    }
    return;
  }
  if (isRecord(value)) {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    if (explode) {
      for (const [key, item] of entries) {
        query.append(key, serializePrimitive(item));
      }
    } else {
      query.append(
        name,
        entries.flatMap(([key, item]) => [key, serializePrimitive(item)]).join(separator),
      );
    }
    return;
  }
  query.append(name, serializePrimitive(value));
}

function appendHeaderValues(
  headers: Headers,
  values: Readonly<Record<string, unknown>> | undefined,
): void {
  if (values === undefined) {
    return;
  }
  for (const name of Object.keys(values).sort()) {
    const value = values[name];
    if (value !== undefined) {
      headers.set(
        name,
        Array.isArray(value) ? value.map(serializePrimitive).join(",") : serializePrimitive(value),
      );
    }
  }
}

function mergeHeaders(target: Headers, source: HeadersInit | undefined): void {
  if (source === undefined) {
    return;
  }
  new Headers(source).forEach((value, name) => target.set(name, value));
}

function serializeBody(body: RestBody<string, unknown>): BodyInit | null {
  const { mediaType, value } = body;
  const essence = mediaTypeEssence(mediaType);
  if (isJson(mediaType)) {
    return stringifyJson(value);
  }
  if (value === undefined) {
    return null;
  }
  if (isMultipart(mediaType)) {
    return toFormData(value);
  }
  if (essence === "application/x-www-form-urlencoded") {
    return toUrlSearchParams(value);
  }
  if (essence.startsWith("text/")) {
    return serializePrimitive(value);
  }
  if (isBodyInit(value)) {
    return value;
  }
  throw new TypeError(`Cannot serialize ${mediaType} request body`);
}

function toFormData(value: unknown): FormData {
  if (value instanceof FormData) {
    return value;
  }
  if (!isRecord(value)) {
    throw new TypeError("Multipart request bodies must be objects or FormData");
  }
  const form = new FormData();
  for (const name of Object.keys(value).sort()) {
    const item = value[name];
    const values = Array.isArray(item) ? item : [item];
    for (const entry of values) {
      if (entry === undefined) {
        continue;
      }
      if (entry instanceof Blob) {
        form.append(name, entry);
      } else if (entry instanceof ArrayBuffer) {
        form.append(name, new Blob([entry]));
      } else if (ArrayBuffer.isView(entry)) {
        form.append(
          name,
          new Blob([new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength).slice()]),
        );
      } else if (isRecord(entry)) {
        form.append(name, stringifyJson(entry));
      } else {
        form.append(name, serializePrimitive(entry));
      }
    }
  }
  return form;
}

function toUrlSearchParams(value: unknown): URLSearchParams {
  if (value instanceof URLSearchParams) {
    return value;
  }
  if (!isRecord(value)) {
    throw new TypeError("URL-encoded request bodies must be objects or URLSearchParams");
  }
  const parameters = new URLSearchParams();
  for (const name of Object.keys(value).sort()) {
    const item = value[name];
    const values = Array.isArray(item) ? item : [item];
    for (const entry of values) {
      if (entry !== undefined) {
        parameters.append(name, serializePrimitive(entry));
      }
    }
  }
  return parameters;
}

function responseAcceptHeader(operation: RestOperation): string | undefined {
  const successfulResponses = operation.responses.filter((response) =>
    typeof response.status === "number" && response.status >= 200 && response.status < 300
  );
  const responses = successfulResponses.length === 0 ? operation.responses : successfulResponses;
  const mediaTypes = new Set(responses.flatMap((response) => response.mediaTypes));
  return [...mediaTypes].sort(compareMediaTypes).join(", ") || undefined;
}

function compareMediaTypes(left: string, right: string): number {
  return mediaTypePriority(left) - mediaTypePriority(right) ||
    mediaTypeEssence(left).localeCompare(mediaTypeEssence(right)) || left.localeCompare(right);
}

function mediaTypePriority(mediaType: string): number {
  const essence = mediaTypeEssence(mediaType);
  if (essence === "application/json") return 0;
  if (essence.endsWith("+json") || essence.includes("json")) return 1;
  if (essence.startsWith("text/")) return 2;
  return 3;
}

function responseMediaType(response: Response): string | undefined {
  const mediaType = response.headers.get("content-type");
  return mediaType === null ? undefined : mediaTypeEssence(mediaType) || undefined;
}

async function parseResponseBody(
  response: Response,
  mode: RestGeneratedDecodeMode | Exclude<RestParseMode, "auto">,
  signal: AbortSignal | undefined,
): Promise<unknown> {
  if (mode === "none") return undefined;
  if (mode === "response") return response;
  if (mode === "stream") return bindResponseStream(response.body, signal);
  const bytes = await readResponseBytes(response.body, signal);
  if (mode === "arrayBuffer") return bytes.buffer;
  if (mode === "bytes") return bytes;
  if (mode === "binary" || mode === "blob") {
    return new Blob([bytes], { type: response.headers.get("content-type") ?? "" });
  }
  const text = new TextDecoder().decode(bytes);
  if (mode === "text") return text;
  if (text === "") throw new SyntaxError("JSON response body is empty");
  return parseJson(text);
}

function bindResponseStream(
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal | undefined,
): ReadableStream<Uint8Array> | null {
  if (body === null || signal === undefined) return body;
  const reader = body.getReader();
  let finished = false;
  const cleanup = (): void => signal.removeEventListener("abort", onAbort);
  const release = (): void => {
    try {
      reader.releaseLock();
    } catch {
      // A pending read retains the lock until cancellation settles.
    }
  };
  let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
  const onAbort = (): void => {
    if (finished) return;
    finished = true;
    cleanup();
    controller?.error(signal.reason);
    void reader.cancel(signal.reason).finally(release).catch(() => undefined);
  };

  return new ReadableStream<Uint8Array>({
    start(streamController) {
      controller = streamController;
      signal.addEventListener("abort", onAbort, { once: true });
      if (signal.aborted) onAbort();
    },
    async pull(streamController) {
      if (finished) return;
      try {
        const chunk = await reader.read();
        if (finished) return;
        if (signal.aborted) {
          onAbort();
        } else if (chunk.done) {
          finished = true;
          cleanup();
          release();
          streamController.close();
        } else {
          streamController.enqueue(chunk.value);
        }
      } catch (error) {
        if (finished) return;
        finished = true;
        cleanup();
        release();
        streamController.error(signal.aborted ? signal.reason : error);
      }
    },
    async cancel(reason) {
      if (finished) return;
      finished = true;
      cleanup();
      try {
        await reader.cancel(reason);
      } finally {
        release();
      }
    },
  }, { highWaterMark: 0 });
}

function bindResponseToSignal(
  response: Response,
  signal: AbortSignal | undefined,
): Response {
  if (response.body === null || signal === undefined) return response;
  const bound = new Response(bindResponseStream(response.body, signal), {
    headers: response.headers,
    status: response.status,
    statusText: response.statusText,
  });
  for (
    const [name, value] of [
      ["redirected", response.redirected],
      ["type", response.type],
      ["url", response.url],
    ] as const
  ) {
    try {
      Object.defineProperty(bound, name, { configurable: true, value });
    } catch {
      // Some runtimes may not permit shadowing native response metadata.
    }
  }
  return bound;
}

async function readResponseBytes(
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal | undefined,
): Promise<Uint8Array<ArrayBuffer>> {
  if (body === null) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  let cancellation: Promise<void> | undefined;
  const release = (): void => {
    try {
      reader.releaseLock();
    } catch {
      // Pending cancellation retains the lock until its promise settles.
    }
  };
  const cancel = (reason: unknown): void => {
    cancellation ??= reader.cancel(reason).catch(() => undefined);
  };
  const onAbort = (): void => {
    cancel(signal?.reason);
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    while (true) {
      throwIfAborted(signal);
      const chunk = await reader.read();
      throwIfAborted(signal);
      if (chunk.done) break;
      chunks.push(chunk.value);
      length += chunk.value.byteLength;
    }
  } catch (error) {
    cancel(signal?.aborted ? signal.reason : error);
    throwIfAborted(signal);
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    if (cancellation === undefined) release();
    else void cancellation.then(release);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

type RestResponseMatch = {
  documented: boolean;
  mediaType?: string;
  decodeAs?: RestGeneratedDecodeMode | "none";
  headerNames?: readonly string[];
};

function matchDocumentedResponse(
  operation: RestOperation,
  status: number,
  mediaType: string | undefined,
): RestResponseMatch {
  const definition = operation.responses.find((response) => response.status === status) ??
    operation.responses.find((response) => response.status === "default");
  if (definition === undefined) {
    return { documented: false };
  }
  if (operation.method === "HEAD" || status === 204 || status === 205) {
    return { documented: true, decodeAs: "none", headerNames: definition.headers };
  }
  if (definition.mediaTypes.length === 0) {
    return mediaType === undefined
      ? { documented: true, decodeAs: "none", headerNames: definition.headers }
      : { documented: false };
  }
  if (mediaType === undefined) return { documented: false };
  const declaredMediaType = definition.mediaTypes.find((candidate) =>
    mediaTypeEssence(candidate) === mediaType
  );
  return declaredMediaType === undefined ? { documented: false } : {
    documented: true,
    mediaType: declaredMediaType,
    decodeAs: responseDecoder(definition, declaredMediaType) ??
      inferResponseDecodeMode(declaredMediaType),
    headerNames: definition.headers,
  };
}

function responseHeaderValues(
  headers: Headers,
  documentedNames: readonly string[] | undefined,
): Readonly<Record<string, string>> {
  const values: Record<string, string> = Object.create(null);
  if (documentedNames === undefined) {
    headers.forEach((value, name) => {
      values[name] = value;
    });
  } else {
    for (const name of [...new Set(documentedNames)].sort()) {
      const value = headers.get(name);
      if (value !== null) values[name] = value;
    }
  }
  return Object.freeze(values);
}

function responseDecoder(
  definition: RestOperationResponse,
  mediaType: string,
): RestGeneratedDecodeMode | undefined {
  const exact = definition.decoders?.[mediaType];
  if (exact !== undefined) return exact;
  const normalized = mediaTypeEssence(mediaType);
  return Object.entries(definition.decoders ?? {}).find(([candidate]) =>
    mediaTypeEssence(candidate) === normalized
  )?.[1];
}

function inferResponseDecodeMode(mediaType: string | undefined): RestGeneratedDecodeMode {
  if (mediaType !== undefined && isJson(mediaType)) return "json";
  const essence = mediaType === undefined ? undefined : mediaTypeEssence(mediaType);
  if (
    essence === undefined || essence.startsWith("text/") || essence.includes("xml") ||
    essence.includes("yaml")
  ) {
    return "text";
  }
  return "binary";
}

function stringifyJson(value: unknown): string {
  let root = true;
  const serialized = JSON.stringify(value, (_key, item) => {
    const isRoot = root;
    root = false;
    if (item === undefined && isRoot) {
      throw new TypeError("Top-level JSON request value cannot be undefined");
    }
    if (typeof item === "function" || typeof item === "symbol") {
      throw new TypeError(`JSON request values cannot contain ${typeof item}`);
    }
    if (typeof item === "bigint") return exactJson.rawJSON(item.toString());
    if (typeof item === "number" && !Number.isFinite(item)) {
      throw new RangeError(`JSON request numbers must be finite: ${String(item)}`);
    }
    if (typeof item === "number" && Number.isInteger(item) && !Number.isSafeInteger(item)) {
      throw new RangeError("Unsafe integer JSON request values must be passed as bigint");
    }
    return item;
  });
  if (serialized === undefined) {
    throw new TypeError("Top-level JSON request value cannot be undefined");
  }
  return serialized;
}

function parseJson(text: string): unknown {
  return exactJson.parse(
    text,
    (_key: string, value: unknown, context: { readonly source: string }) => {
      return typeof value === "number" ? parseJsonNumberToken(context.source, value) : value;
    },
  );
}

type NormalizedJsonNumber = {
  coefficient: string;
  exponent: number;
  negative: boolean;
};

function parseJsonNumberToken(source: string, value: number): RestJsonNumber {
  const exact = normalizeJsonNumber(source);
  if (exact.coefficient === "0") return value;
  if (exact.exponent >= 0) {
    if (
      exact.coefficient.length > REST_JSON_MAX_INTEGER_DIGITS ||
      exact.exponent > REST_JSON_MAX_INTEGER_DIGITS - exact.coefficient.length
    ) {
      throw new RangeError(
        `JSON response integer exceeds the ${REST_JSON_MAX_INTEGER_DIGITS}-digit safety limit: ${source}`,
      );
    }
    const integer = BigInt(
      `${exact.negative ? "-" : ""}${exact.coefficient}${"0".repeat(exact.exponent)}`,
    );
    return integer >= -9007199254740991n && integer <= 9007199254740991n
      ? Number(integer)
      : integer;
  }

  if (!Number.isFinite(value)) {
    throw new RangeError(`JSON response number exceeds the supported finite range: ${source}`);
  }
  const runtime = normalizeJsonNumber(value.toString());
  if (
    exact.negative !== runtime.negative || exact.coefficient !== runtime.coefficient ||
    exact.exponent !== runtime.exponent
  ) {
    throw new RangeError(`JSON response number loses precision: ${source}`);
  }
  return value;
}

function normalizeJsonNumber(source: string): NormalizedJsonNumber {
  const match = /^(-?)(0|[1-9]\d*)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(source);
  if (match === null) throw new SyntaxError(`Invalid JSON number token: ${source}`);
  const fraction = match[3] ?? "";
  let coefficient = `${match[2]}${fraction}`.replace(/^0+/, "");
  if (coefficient === "") return { coefficient: "0", exponent: 0, negative: false };

  const explicitExponent = Number(match[4] ?? "0");
  if (!Number.isSafeInteger(explicitExponent)) {
    throw new RangeError(`JSON response exponent is too large to preserve exactly: ${source}`);
  }
  let exponent = explicitExponent - fraction.length;
  const trailingZeroCount = /0+$/.exec(coefficient)?.[0].length ?? 0;
  if (trailingZeroCount > 0) {
    coefficient = coefficient.slice(0, -trailingZeroCount);
    exponent += trailingZeroCount;
  }
  if (!Number.isSafeInteger(exponent)) {
    throw new RangeError(`JSON response exponent is too large to preserve exactly: ${source}`);
  }
  return { coefficient, exponent, negative: match[1] === "-" };
}

const exactJson = JSON as typeof JSON & {
  rawJSON(source: string): unknown;
  parse(
    text: string,
    reviver: (key: string, value: unknown, context: { readonly source: string }) => unknown,
  ): unknown;
};

function serializePrimitive(value: unknown): string {
  if (value === null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new RangeError(`Path/query/header numbers must be finite: ${String(value)}`);
  }
  if (typeof value === "number" && Number.isInteger(value) && !Number.isSafeInteger(value)) {
    throw new RangeError("Unsafe integer path/query/header values must be passed as bigint");
  }
  if (
    typeof value === "string" || typeof value === "number" || typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return stringifyJson(value);
}

function isJson(mediaType: string): boolean {
  const essence = mediaTypeEssence(mediaType);
  return essence === "application/json" || essence.endsWith("+json") ||
    essence.includes("json");
}

function isMultipart(mediaType: string): boolean {
  return mediaTypeEssence(mediaType).startsWith("multipart/");
}

function mediaTypeEssence(mediaType: string): string {
  return mediaType.split(";", 1)[0]?.trim().toLowerCase() ?? "";
}

function isBodyInit(value: unknown): value is BodyInit {
  return typeof value === "string" ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof ReadableStream ||
    value instanceof URLSearchParams;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function isAbsoluteUrl(value: string): boolean {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value);
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  signal?.throwIfAborted();
}

function preserveRequestCancellation(request: Request, signal: AbortSignal | undefined): Request {
  if (signal === undefined) return request;
  return new Request(request, {
    signal: AbortSignal.any([signal, request.signal]),
  });
}

async function runBeforeRequestHook(
  currentRequest: Request,
  callback: () => MaybePromise<Request>,
  signal: AbortSignal | undefined,
): Promise<Request> {
  return await runReplacementHookWithSignal(
    currentRequest,
    callback,
    signal,
    cancelRequestBody,
    () => new Error("Request body discarded after beforeRequest returned a replacement"),
  );
}

async function runFetchWithSignal(
  request: Request,
  callback: () => MaybePromise<Response>,
  signal: AbortSignal | undefined,
): Promise<Response> {
  if (signal?.aborted) {
    cancelRequestBody(request, signal.reason);
    throw signal.reason;
  }
  const pending = Promise.resolve().then(callback);
  if (signal === undefined) {
    try {
      return await pending;
    } catch (error) {
      cancelRequestBody(request, error);
      throw error;
    }
  }

  return await new Promise<Response>((resolve, reject) => {
    let aborted = false;
    let settled = false;
    const cleanup = (): void => signal.removeEventListener("abort", onAbort);
    const onAbort = (): void => {
      if (settled) return;
      aborted = true;
      settled = true;
      cleanup();
      cancelRequestBody(request, signal.reason);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    pending.then(
      (response) => {
        if (settled) {
          if (aborted) cancelResponseBody(response, signal.reason);
          return;
        }
        settled = true;
        cleanup();
        resolve(response);
      },
      (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        cancelRequestBody(request, error);
        reject(error);
      },
    );
  });
}

async function runAfterResponseHook(
  currentResponse: Response,
  callback: () => MaybePromise<Response>,
  signal: AbortSignal | undefined,
): Promise<Response> {
  return await runReplacementHookWithSignal(
    currentResponse,
    callback,
    signal,
    cancelResponseBody,
    () => new Error("Response body discarded after afterResponse returned a replacement"),
  );
}

async function runReplacementHookWithSignal<TValue extends object>(
  currentValue: TValue,
  callback: () => MaybePromise<TValue>,
  signal: AbortSignal | undefined,
  cancel: (value: TValue, reason: unknown) => void,
  replacementReason: () => unknown,
): Promise<TValue> {
  if (signal === undefined) {
    try {
      const replacement = await callback();
      if (replacement !== currentValue) cancel(currentValue, replacementReason());
      return replacement;
    } catch (error) {
      cancel(currentValue, error);
      throw error;
    }
  }
  if (signal.aborted) {
    cancel(currentValue, signal.reason);
    throw signal.reason;
  }

  const pending = Promise.resolve().then(callback);
  return await new Promise<TValue>((resolve, reject) => {
    let aborted = false;
    let settled = false;
    const cleanup = (): void => signal.removeEventListener("abort", onAbort);
    const onAbort = (): void => {
      if (settled) return;
      aborted = true;
      settled = true;
      cleanup();
      cancel(currentValue, signal.reason);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) onAbort();
    pending.then(
      (replacement) => {
        if (settled) {
          if (aborted && replacement !== currentValue) cancel(replacement, signal.reason);
          return;
        }
        settled = true;
        cleanup();
        if (replacement !== currentValue) cancel(currentValue, replacementReason());
        resolve(replacement);
      },
      (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        cancel(currentValue, error);
        reject(error);
      },
    );
  });
}

function cancelResponseBody(response: Response, reason: unknown): void {
  if (response.body === null) return;
  void response.body.cancel(reason).catch(() => undefined);
}

function cancelRequestBody(request: Request, reason: unknown): void {
  if (request.body === null) return;
  void request.body.cancel(reason).catch(() => undefined);
}

async function runWithSignal<T>(
  callback: () => MaybePromise<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  throwIfAborted(signal);
  const value = Promise.resolve().then(callback);
  if (signal === undefined) return await value;

  return await new Promise<T>((resolve, reject) => {
    let settled = false;
    const settle = (callback: (value: T | PromiseLike<T>) => void, result: T): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      callback(result);
    };
    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      reject(error);
    };
    const onAbort = (): void => fail(signal.reason);

    signal.addEventListener("abort", onAbort, { once: true });
    value.then((result) => settle(resolve, result), fail);
  });
}
