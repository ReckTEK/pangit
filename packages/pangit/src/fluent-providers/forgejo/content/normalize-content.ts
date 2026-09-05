import type { ForgejoProviderTypes } from "../provider-types.ts";
import { ContentUnavailableError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ContentData,
  RepositoryContentKind,
} from "../../../fluent-api/adapter-contract/content.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import {
  createForgejoEntityNative,
  type ForgejoClient,
  type ForgejoEntityPayload,
  type ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";

import { optionalNonNegativeInteger, optionalText, requiredText } from "./validate-payload.ts";

import type { AnyForgejoContent } from "./payload-types.ts";
import { invariant } from "./validation.ts";

/** Normalize one exact generated content payload without fetching any linked URL. */
export function normalizeForgejoContent<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  client: ForgejoClient<TVersion>,
  payload: ForgejoEntityPayload<TVersion, "content">,
  includeBytes: boolean,
  operation = "readContent",
): ContentData<"forgejo", TVersion, ForgejoProviderTypes> {
  const kind = contentKind(payload);
  const path = requiredText(payload.path, "content path");
  const name = requiredText(payload.name, `content ${path} name`);
  const sha = optionalText(payload.sha);
  const size = optionalNonNegativeInteger(payload.size);
  const lastCommitSha = optionalText(payload.last_commit_sha);
  const bytes = includeBytes && kind === "file"
    ? decodeContentBytes(context, payload, path, operation)
    : undefined;
  return Object.freeze({
    kind,
    path,
    name,
    ...(sha === undefined ? {} : { sha }),
    ...(size === undefined ? {} : { size }),
    ...(bytes === undefined ? {} : { bytes }),
    ...(kind !== "symlink"
      ? {}
      : { target: requiredText(payload.target, `symlink ${path} target`) }),
    ...(kind !== "submodule" ? {} : {
      submoduleUrl: requiredText(payload.submodule_git_url, `submodule ${path} URL`),
    }),
    ...(lastCommitSha === undefined ? {} : { lastCommitSha }),
    native: createForgejoEntityNative("content", client, payload),
  });
}

export function contentKind(value: AnyForgejoContent): RepositoryContentKind {
  switch (value.type) {
    case "file":
      return "file";
    case "dir":
      return "directory";
    case "symlink":
      return "symlink";
    case "submodule":
      return "submodule";
    default:
      throw new TypeError(`unsupported Forgejo content type ${String(value.type)}`);
  }
}
function decodeContentBytes<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  payload: AnyForgejoContent,
  path: string,
  operation: string,
): Uint8Array {
  if (payload.content == null) {
    if ((optionalNonNegativeInteger(payload.size) ?? 0) > 0) {
      throw new ContentUnavailableError(`content bytes for ${path} exceed the Forgejo API limit`, {
        provider: "forgejo",
        version: context.version,
        operation,
      });
    }
    throw invariant(context, operation, `file ${path} returned no encoded content`, payload);
  }
  if (payload.encoding !== "base64") {
    throw invariant(
      context,
      operation,
      `file ${path} returned unsupported encoding ${String(payload.encoding)}`,
      payload,
    );
  }
  const encoded = payload.content.replace(/\s/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw invariant(context, operation, `file ${path} returned malformed base64`, payload);
  }
  try {
    return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  } catch (cause) {
    throw invariant(context, operation, `file ${path} returned malformed base64`, cause);
  }
}
