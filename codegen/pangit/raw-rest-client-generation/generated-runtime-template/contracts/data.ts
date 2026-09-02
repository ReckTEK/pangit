/** Buffered binary data accepted by generated request models. Raw requests still accept streams. */
export type RestBinary = ArrayBuffer | Blob | Uint8Array;

/** Exact JSON numbers retain unsafe integral values as bigint. */
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
