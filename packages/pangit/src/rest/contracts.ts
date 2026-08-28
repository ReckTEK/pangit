/** Shared contracts for generated provider metadata and the native-Fetch transport. */
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

export type MaybePromise<T> = Promise<T> | T;

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
