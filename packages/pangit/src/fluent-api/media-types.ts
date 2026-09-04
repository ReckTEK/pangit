import type { ContentBlobOptions, ProviderMediaType } from "./adapter-contract/content-body.ts";
import {
  ContentReadError,
  ValidationError,
  type ValidationErrorContext,
} from "./adapter-contract/errors.ts";
import { mediaTypeByExtension } from "./generated-media-types.ts";

/** Generic binary defaults do not identify a file format. Explicit caller overrides may use them. */
const genericMediaTypes = new Set([
  "application/octet-stream",
  "binary/octet-stream",
  "application/binary",
  "application/unknown",
  "unknown/unknown",
]);

/** Normalize the MIME essence; charset and other delivery parameters are not file-format metadata. */
function mediaTypeEssence(value: string): string | undefined {
  if (typeof value !== "string") return undefined;
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return undefined;
  }
  const essence = value.split(";", 1)[0].trim().toLowerCase();
  // RFC 6838 restricted-name syntax: a registered type/subtype, not a wildcard or header list.
  const name = "[a-z0-9][a-z0-9!#$&^_.+-]{0,126}";
  return new RegExp(`^${name}/${name}$`).test(essence) ? essence : undefined;
}

/** Reject bad caller hints before making a provider request. */
export function validateContentBlobOptions(
  options: ContentBlobOptions,
  context: ValidationErrorContext,
): void {
  if (options.type !== undefined && mediaTypeEssence(options.type) === undefined) {
    throw new ContentReadError(
      "Blob type must be a valid MIME type",
      "invalid-media-type",
      context,
    );
  }
  if (
    options.fileName !== undefined &&
    (typeof options.fileName !== "string" || options.fileName.trim().length === 0 ||
      options.fileName.includes("\0"))
  ) {
    throw new ValidationError("Blob filename hint must be a nonempty filename or path", context);
  }
}

/** A repository path is not a URL: literal ?, #, and percent escapes remain part of its filename. */
function mediaTypeForPath(path: string | undefined): string | undefined {
  if (path === undefined) return undefined;
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return undefined;
  const extension = name.slice(dot + 1).toLowerCase();
  return Object.hasOwn(mediaTypeByExtension, extension)
    ? mediaTypeByExtension[extension]
    : undefined;
}

/** One provider-neutral policy shared by direct reads and loaded content/Git blob conversions. */
export function resolveContentMediaType(
  data: { readonly path?: string; readonly mediaType?: ProviderMediaType },
  options: ContentBlobOptions,
  context: ValidationErrorContext,
): string {
  validateContentBlobOptions(options, context);
  if (options.type !== undefined) return mediaTypeEssence(options.type)!;

  const supplied = data.mediaType?.reliable === true
    ? mediaTypeEssence(data.mediaType.value)
    : undefined;
  if (supplied !== undefined && !genericMediaTypes.has(supplied)) return supplied;

  const inferred = mediaTypeForPath(options.fileName ?? data.path);
  if (inferred !== undefined && !genericMediaTypes.has(inferred)) return inferred;

  throw new ContentReadError(
    "Cannot determine the file MIME type; supply a known fileName or an explicit type",
    "unknown-media-type",
    context,
  );
}
