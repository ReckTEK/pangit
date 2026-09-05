import type {
  ContentData,
  ReadContentOptions,
  ReadFileOptions,
} from "../../../fluent-api/adapter-contract/content.ts";
import {
  decodeContentText,
  parseContentJson,
  requireContentBytes,
} from "../../../fluent-api/content-body.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoEntityPayload, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import type { ForgejoOperationIdentity } from "../transport/response/mod.ts";
import { validationContext } from "./validation.ts";
import { getContents } from "./get-contents.ts";
import { isContentArray } from "./validate-payload.ts";
import { normalizeForgejoContent } from "./normalize-content.ts";
import { normalizeDirectoryWrapper } from "./read-directory.ts";

/** Read one exact path with one contents request and no external dereferencing. */
export async function readForgejoContent<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  path: string,
  options: ReadContentOptions = {},
  operation: ForgejoOperationIdentity = {
    universal: "readContent",
    native: "repoGetContents",
  },
): Promise<ContentData<"forgejo", TVersion>> {
  const requestedPath = requireIdentity(
    path,
    "content path",
    validationContext(context, operation.universal),
  );
  const client = await context.client();
  const payload = await getContents(
    context,
    client,
    repository,
    requestedPath,
    options.ref,
    operation,
    options.signal,
  );
  if (!isContentArray(payload)) {
    return normalizeForgejoContent(
      context,
      client,
      payload as ForgejoEntityPayload<TVersion, "content">,
      options.includeBytes ?? true,
      operation.universal,
    );
  }
  return normalizeDirectoryWrapper(
    client,
    requestedPath,
    payload as readonly ForgejoEntityPayload<TVersion, "content">[],
  );
}

/** Read an exact file path as bytes with one contents request. */
export async function readForgejoContentBytes<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  path: string,
  options: ReadFileOptions = {},
  operation = "readContentBytes",
): Promise<Uint8Array> {
  const content = await readForgejoContent(
    context,
    repository,
    path,
    { ...options, includeBytes: true },
    { universal: operation, native: "repoGetContents" },
  );
  return requireContentBytes(content, validationContext(context, operation));
}

/** Read an exact file path as strict UTF-8 text, without following links. */
export async function readForgejoContentText<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  path: string,
  options: ReadFileOptions = {},
): Promise<string> {
  const operation = "readContentText";
  const bytes = await readForgejoContentBytes(context, repository, path, options, operation);
  return decodeContentText(bytes, validationContext(context, operation));
}

/** Read an exact file path as JSON without asserting a caller-specific schema. */
export async function readForgejoContentJson<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion>,
  path: string,
  options: ReadFileOptions = {},
): Promise<unknown> {
  const operation = "readContentJson";
  const bytes = await readForgejoContentBytes(context, repository, path, options, operation);
  return parseContentJson(bytes, validationContext(context, operation));
}
