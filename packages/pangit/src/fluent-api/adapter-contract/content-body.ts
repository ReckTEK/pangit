/** A provider's MIME type for the file bytes, never the JSON response envelope. */
export interface ProviderMediaType {
  readonly value: string;
  /** False for generic defaults or MIME types coerced for safe browser delivery. */
  readonly reliable: boolean;
}

/** MIME hints for conversion to a standard web Blob. No provider I/O. */
export interface ContentBlobOptions {
  /** Explicit MIME type override. Parameters are discarded; the type is normalized to lowercase. */
  readonly type?: string;
  /** Filename/path hint for extension lookup, particularly for SHA-addressed Git blobs. */
  readonly fileName?: string;
}

/** Synchronous, repeatable conversions of an already-loaded content snapshot. No provider I/O. */
export interface ReadableContentBody {
  /** Decode UTF-8, stripping its BOM. Invalid UTF-8 throws ContentReadError. */
  text(): string;
  /** Parse UTF-8 JSON. The result is unknown until validated by the caller. */
  json(): unknown;
  /** Return an independent buffer containing the exact file bytes. */
  arrayBuffer(): ArrayBuffer;
  /** Return a standard web Blob with a resolved MIME type, or throw ContentReadError. */
  blob(options?: ContentBlobOptions): globalThis.Blob;
}

/** Why an existing content snapshot cannot be read in the requested representation. */
export type ContentReadFailure =
  | "not-a-file"
  | "bytes-unavailable"
  | "invalid-utf8"
  | "invalid-json"
  | "invalid-media-type"
  | "unknown-media-type";
