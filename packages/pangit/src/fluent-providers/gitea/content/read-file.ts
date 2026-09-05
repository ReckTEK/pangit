import type { GiteaProviderTypes } from "../provider-types.ts";
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

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type {
  GiteaContentsExtPayload,
  GiteaEntityPayload,
  GiteaVersion,
} from "../native/GiteaEntityNative.ts";
import type { GiteaOperationIdentity } from "../transport/response/mod.ts";
import { validationContext } from "./validation.ts";
import { getContentsExt } from "./read-files.ts";
import { normalizeGiteaContent } from "./normalize-content.ts";
import { normalizeDirectoryWrapper } from "./read-directory.ts";

/** Read one exact path with one contents-ext request and no external dereferencing. */
export async function readGiteaContent<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  path: string,
  options: ReadContentOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "readContent",
    native: "repoGetContentsExt",
  },
): Promise<ContentData<"gitea", TVersion, GiteaProviderTypes>> {
  const requestedPath = requireIdentity(
    path,
    "content path",
    validationContext(context, operation.universal),
  );
  const client = await context.client();
  const payload = await getContentsExt(
    context,
    client,
    repository,
    requestedPath,
    options.ref,
    {
      includeBytes: options.includeBytes ?? true,
      includeCommitMetadata: options.includeCommitMetadata === true,
    },
    operation,
    options.signal,
  );
  if (payload.file_contents != null) {
    return normalizeGiteaContent(
      context,
      client,
      payload.file_contents as GiteaEntityPayload<TVersion, "content">,
      options.includeBytes ?? true,
      operation.universal,
    );
  }
  return normalizeDirectoryWrapper(
    client,
    requestedPath,
    payload as GiteaContentsExtPayload<TVersion>,
  );
}

/** Read an exact file path as bytes with one contents-ext request. */
export async function readGiteaContentBytes<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  path: string,
  options: ReadFileOptions = {},
  operation = "readContentBytes",
): Promise<Uint8Array> {
  const content = await readGiteaContent(
    context,
    repository,
    path,
    { ...options, includeBytes: true },
    { universal: operation, native: "repoGetContentsExt" },
  );
  return requireContentBytes(content, validationContext(context, operation));
}

/** Read an exact file path as strict UTF-8 text, without following links. */
export async function readGiteaContentText<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  path: string,
  options: ReadFileOptions = {},
): Promise<string> {
  const operation = "readContentText";
  const bytes = await readGiteaContentBytes(context, repository, path, options, operation);
  return decodeContentText(bytes, validationContext(context, operation));
}

/** Read an exact file path as JSON without asserting a caller-specific schema. */
export async function readGiteaContentJson<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  path: string,
  options: ReadFileOptions = {},
): Promise<unknown> {
  const operation = "readContentJson";
  const bytes = await readGiteaContentBytes(context, repository, path, options, operation);
  return parseContentJson(bytes, validationContext(context, operation));
}
