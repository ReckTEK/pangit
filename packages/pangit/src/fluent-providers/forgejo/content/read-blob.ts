import type { ForgejoProviderTypes } from "../provider-types.ts";
import { loadRestClientModule } from "../transport/create-rest-client.ts";
import { ContentReadError } from "../../../fluent-api/adapter-contract/errors.ts";
import type { ReadContentBlobOptions } from "../../../fluent-api/adapter-contract/content.ts";
import { createWebBlob, validateContentBlobOptions } from "../../../fluent-api/content-body.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { requestForgejoBytes } from "../transport/response/mod.ts";
import { invariant, requestOptions, validationContext } from "./validation.ts";
import { readForgejoContent } from "./read-file.ts";

import { repositoryPath } from "./paths.ts";

/** Read metadata, then the same immutable file's raw bytes and provider MIME type. */
export async function readForgejoContentBlob<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  path: string,
  options: ReadContentBlobOptions = {},
): Promise<globalThis.Blob> {
  const operation = "readContentBlob";
  const errorContext = validationContext(context, operation);
  validateContentBlobOptions(options, errorContext);
  const requestedPath = requireIdentity(path, "content path", errorContext);
  // Forgejo's raw endpoint infers branches from path prefixes and silently accepts unknown refs.
  // Resolve the exact path first, then pin the download to its last change's immutable commit.
  const content = await readForgejoContent(
    context,
    repository,
    requestedPath,
    { ...options, includeBytes: false, includeCommitMetadata: true },
    { universal: operation, native: "repoGetContents" },
  );
  if (content.kind !== "file") {
    throw new ContentReadError("Only file content has a readable body", "not-a-file", errorContext);
  }
  if (
    content.path !== requestedPath ||
    !isFullGitObjectId(content.sha) || !isFullGitObjectId(content.lastCommitSha)
  ) {
    throw invariant(
      context,
      operation,
      "returned incomplete or mismatched immutable file metadata",
    );
  }
  const client = await context.client();
  const rawOperation =
    (await loadRestClientModule(context.version)).forgejoOperations.repoGetRawFile;
  const response = await requestForgejoBytes(
    context,
    { universal: operation, native: "repoGetRawFile" },
    () =>
      client.rest.request(
        rawOperation,
        {
          path: { ...repositoryPath(repository), filepath: requestedPath },
          query: { ref: content.lastCommitSha },
        },
        { ...requestOptions(options.signal), parseAs: "bytes" },
      ),
    options.signal,
  );
  const objectType = response.headers.get("x-forgejo-object-type");
  if (objectType !== "file") {
    throw invariant(context, operation, "raw response did not identify a regular file");
  }
  if (response.headers.get("etag")?.toLowerCase() !== `"${content.sha.toLowerCase()}"`) {
    throw invariant(context, operation, "raw response did not match the requested file's blob SHA");
  }
  if (content.size !== undefined && content.size !== response.body.byteLength) {
    throw invariant(context, operation, "raw response length did not match the file metadata");
  }
  const mediaType = response.headers.get("content-type");
  const essence = mediaType?.split(";", 1)[0].trim().toLowerCase();
  return createWebBlob(
    {
      kind: "file",
      path: content.path,
      bytes: response.body,
      ...(mediaType === null ? {} : {
        mediaType: {
          value: mediaType,
          // Forgejo deliberately coerces text (including HTML/source) and unknown binary to these.
          reliable: essence !== "text/plain" && essence !== "application/octet-stream",
        },
      }),
    },
    options,
    errorContext,
  );
}

function isFullGitObjectId(value: string | undefined): value is string {
  return value !== undefined && /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/i.test(value);
}
