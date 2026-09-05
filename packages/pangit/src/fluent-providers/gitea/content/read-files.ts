import type { GiteaProviderTypes } from "../provider-types.ts";
import type {
  ContentReadResult,
  ReadFilesOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaClient, GiteaVersion } from "../native/GiteaEntityNative.ts";
import {
  type GiteaOperationIdentity,
  mapGiteaBounded,
  requestGiteaBody,
} from "../transport/response/mod.ts";
import { invariant, requestOptions, validateBatchPaths, validationContext } from "./validation.ts";
import { boundedConcurrency, chunk } from "./batch.ts";

import type { AnyGiteaContent, AnyGiteaContentsExt } from "./payload-types.ts";
import { isContentsExt, isFileBatchResponse, requiredText } from "./validate-payload.ts";

import { normalizeBatchRead } from "./normalize-content.ts";

import { providerContentPath, repositoryPath } from "./paths.ts";

/** Conservative batch size until both pinned Gitea versions publish a live-proven larger limit. */
export const GITEA_CONTENT_BATCH_SIZE = 50;

/** Batch only requested unique paths, then reconstruct duplicates in stable input order. */
export async function readGiteaFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  paths: readonly string[],
  options: ReadFilesOptions = {},
): Promise<readonly ContentReadResult<"gitea", TVersion, GiteaProviderTypes>[]> {
  return await readFilesInternal(context, repository, paths, options, true, "readFiles");
}

export async function readFilesInternal<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  paths: readonly string[],
  options: ReadFilesOptions,
  includeBytes: boolean,
  operation: "readFiles" | "readPathMetadataBatch",
): Promise<readonly ContentReadResult<"gitea", TVersion, GiteaProviderTypes>[]> {
  const operationIdentity = { universal: operation, native: "repoGetFileContentsPost" } as const;
  const validated = validateBatchPaths(context, operation, paths, options.maxItems);
  if (validated.length === 0) return Object.freeze([]);
  const unique = [...new Set(validated)];
  const chunks = chunk(unique, GITEA_CONTENT_BATCH_SIZE);
  const client = await context.client();
  const responses = await mapGiteaBounded(
    context,
    operationIdentity,
    chunks,
    boundedConcurrency(context, operation, options.concurrency),
    options.signal,
    (paths, _index, workerSignal) =>
      readOneFileBatch(
        context,
        client,
        repository,
        paths,
        options.ref,
        operationIdentity,
        workerSignal,
      ),
  );
  const results = new Map<string, ContentReadResult<"gitea", TVersion, GiteaProviderTypes>>();
  for (let index = 0; index < chunks.length; index++) {
    const requestPaths = chunks[index];
    const payloads = responses[index];
    const byPath = new Map<string, AnyGiteaContent>();
    for (const payload of payloads) {
      if (payload === null) continue;
      const responsePath = requiredText(payload.path, "batch content path");
      if (!requestPaths.includes(responsePath) || byPath.has(responsePath)) {
        throw invariant(
          context,
          operation,
          `batch response returned unexpected or duplicate path ${responsePath}`,
          payloads,
        );
      }
      byPath.set(responsePath, payload);
    }
    for (let item = 0; item < requestPaths.length; item++) {
      const path = requestPaths[item];
      const positional = payloads[item];
      const payload = positional !== null && positional !== undefined && positional.path === path
        ? positional
        : byPath.get(path);
      results.set(path, normalizeBatchRead(context, client, path, payload, includeBytes));
    }
  }
  return Object.freeze(validated.map((path) => results.get(path)!));
}

export async function getContentsExt<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: { readonly owner: string; readonly name: string },
  requestedPath: string,
  ref: string | undefined,
  includes: { readonly includeBytes: boolean; readonly includeCommitMetadata: boolean },
  operation: GiteaOperationIdentity,
  signal?: AbortSignal,
): Promise<AnyGiteaContentsExt> {
  const include = [
    ...(includes.includeBytes ? ["file_content"] : []),
    ...(includes.includeCommitMetadata ? ["commit_metadata"] : []),
  ];
  const payload = await requestGiteaBody<AnyGiteaContentsExt, TVersion>(
    context,
    operation,
    () =>
      client.repoGetContentsExt(
        {
          path: { ...repositoryPath(repository), filepath: providerContentPath(requestedPath) },
          query: {
            ...(ref === undefined ? {} : {
              ref: requireIdentity(
                ref,
                "content ref",
                validationContext(context, operation.universal),
              ),
            }),
            ...(include.length === 0 ? {} : { includes: include.join(",") }),
          },
        },
        requestOptions(signal),
      ),
    signal,
    isContentsExt,
  );
  return payload;
}

export async function readOneFileBatch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  paths: readonly string[],
  ref: string | undefined,
  operation: GiteaOperationIdentity,
  signal?: AbortSignal,
): Promise<readonly (AnyGiteaContent | null)[]> {
  return await requestGiteaBody<readonly (AnyGiteaContent | null)[], TVersion>(
    context,
    operation,
    () =>
      client.repoGetFileContentsPost(
        {
          path: repositoryPath(repository),
          query: ref === undefined ? {} : {
            ref: requireIdentity(
              ref,
              "content ref",
              validationContext(context, operation.universal),
            ),
          },
          body: { mediaType: "application/json", value: { files: [...paths] } },
        },
        requestOptions(signal),
      ),
    signal,
    isFileBatchResponse,
  );
}
