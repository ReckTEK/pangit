import type {
  ContentBlobOptions,
  ProviderMediaType,
  ReadableContentBody,
} from "./adapter-contract/content-body.ts";
import type { RepositoryContentKind } from "./adapter-contract/content.ts";
import { ContentReadError, type ValidationErrorContext } from "./adapter-contract/errors.ts";
import { resolveContentMediaType } from "./media-types.ts";

export { validateContentBlobOptions } from "./media-types.ts";

interface ContentBodyData {
  readonly kind?: RepositoryContentKind;
  readonly bytes?: Readonly<Uint8Array>;
  readonly path?: string;
  readonly mediaType?: ProviderMediaType;
}

/** Require a loaded file body; never substitute empty bytes for absent content. */
export function requireContentBytes(
  data: ContentBodyData,
  context: ValidationErrorContext,
): Uint8Array<ArrayBuffer> {
  if (data.kind !== undefined && data.kind !== "file") {
    throw new ContentReadError("Only file content has a readable body", "not-a-file", context);
  }
  if (data.bytes === undefined) {
    throw new ContentReadError("Content bytes were not loaded", "bytes-unavailable", context);
  }
  return data.bytes.slice();
}

/** Build an immutable standard web Blob from a loaded file body and shared MIME resolution. */
export function createWebBlob(
  data: ContentBodyData,
  options: ContentBlobOptions,
  context: ValidationErrorContext,
): globalThis.Blob {
  const bytes = requireContentBytes(data, context);
  return new globalThis.Blob([bytes], { type: resolveContentMediaType(data, options, context) });
}

/** Decode the same strict UTF-8 representation for every fluent provider. */
export function decodeContentText(bytes: Uint8Array, context: ValidationErrorContext): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new ContentReadError("Content is not valid UTF-8", "invalid-utf8", { ...context, cause });
  }
}

/** JSON parsing provides no application-schema validation or unchecked generic cast. */
export function parseContentJson(bytes: Uint8Array, context: ValidationErrorContext): unknown {
  const text = decodeContentText(bytes, context);
  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ContentReadError("Content is not valid JSON", "invalid-json", { ...context, cause });
  }
}

/** Attach repeatable conversions to an entity's private defensive byte snapshot. */
export function createContentBody(
  data: ContentBodyData,
  operation: string,
): ReadableContentBody {
  return {
    text() {
      const context = { operation: `${operation}.text` };
      return decodeContentText(requireContentBytes(data, context), context);
    },
    json() {
      const context = { operation: `${operation}.json` };
      return parseContentJson(requireContentBytes(data, context), context);
    },
    arrayBuffer() {
      const bytes = requireContentBytes(data, { operation: `${operation}.arrayBuffer` });
      const buffer = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(buffer).set(bytes);
      return buffer;
    },
    blob(options: ContentBlobOptions = {}) {
      return createWebBlob(data, options, { operation: `${operation}.blob` });
    },
  };
}
