import { ContentUnavailableError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ContentData,
  ContentReadResult,
  RepositoryContentKind,
} from "../../../fluent-api/adapter-contract/content.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  createGiteaEntityNative,
  type GiteaClient,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "../native/GiteaEntityNative.ts";

import { optionalNonNegativeInteger, optionalText, requiredText } from "./validate-payload.ts";

import type { AnyGiteaContent } from "./payload-types.ts";
import { invariant } from "./validation.ts";

/** Normalize one exact generated content payload without fetching any linked URL. */
export function normalizeGiteaContent<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  payload: GiteaEntityPayload<TVersion, "content">,
  includeBytes: boolean,
  operation = "readContent",
): ContentData<"gitea", TVersion> {
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
    native: createGiteaEntityNative("content", client, payload),
  });
}

export function normalizeBatchRead<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  path: string,
  payload: AnyGiteaContent | undefined,
  includeBytes: boolean,
): ContentReadResult<"gitea", TVersion> {
  if (payload === undefined) return Object.freeze({ path, unavailable: "missing" });
  const kind = contentKind(payload);
  if (kind !== "file") {
    return Object.freeze({
      path,
      content: normalizeGiteaContent(
        context,
        client,
        payload as GiteaEntityPayload<TVersion, "content">,
        false,
      ),
      unavailable: "not-a-file",
    });
  }
  if (includeBytes && payload.content == null && optionalNonNegativeInteger(payload.size)! > 0) {
    return Object.freeze({
      path,
      content: normalizeGiteaContent(
        context,
        client,
        payload as GiteaEntityPayload<TVersion, "content">,
        false,
      ),
      unavailable: "too-large",
    });
  }
  return Object.freeze({
    path,
    content: normalizeGiteaContent(
      context,
      client,
      payload as GiteaEntityPayload<TVersion, "content">,
      includeBytes,
    ),
  });
}

function decodeContentBytes<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  payload: AnyGiteaContent,
  path: string,
  operation: string,
): Uint8Array {
  if (payload.content == null) {
    if ((optionalNonNegativeInteger(payload.size) ?? 0) > 0) {
      throw new ContentUnavailableError(`content bytes for ${path} exceed the Gitea API limit`, {
        provider: "gitea",
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

export function contentKind(value: AnyGiteaContent): RepositoryContentKind {
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
      throw new TypeError(`unsupported Gitea content type ${String(value.type)}`);
  }
}
