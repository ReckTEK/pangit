import { OperationTimeoutError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ContentData,
  ListDirectoryOptions,
  ReadContentOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import {
  createGiteaContentsExtNative,
  type GiteaClient,
  type GiteaContentsExtPayload,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "../native/GiteaEntityNative.ts";
import {
  type GiteaOperationIdentity,
  mapGiteaBounded,
  requestOptionalGiteaBody,
} from "../transport/response/mod.ts";
import {
  baseName,
  displayPath,
  normalizeDirectoryPath,
  providerContentPath,
  repositoryPath,
} from "./paths.ts";
import { getContentsExt } from "./read-files.ts";
import { invariant, requestOptions, validationContext, validationError } from "./validation.ts";

import { contentKind, normalizeGiteaContent } from "./normalize-content.ts";
import { isContentsExt, requiredText } from "./validate-payload.ts";

import { boundedConcurrency } from "./batch.ts";
import type { AnyGiteaContent, AnyGiteaContentsExt } from "./payload-types.ts";

/** Require one direct contents-ext result to be a directory and retain its exact wrapper. */
export async function getGiteaDirectory<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  path: string,
  options: ReadContentOptions = {},
): Promise<ContentData<"gitea", TVersion>> {
  const operation = { universal: "getDirectory", native: "repoGetContentsExt" } as const;
  const requestedPath = normalizeDirectoryPath(context, "getDirectory", path);
  const client = await context.client();
  const payload = await getContentsExt(
    context,
    client,
    repository,
    requestedPath,
    options.ref,
    { includeBytes: false, includeCommitMetadata: options.includeCommitMetadata === true },
    operation,
    options.signal,
  );
  if (payload.dir_contents == null) {
    throw validationError(
      context,
      "getDirectory",
      `${displayPath(requestedPath)} is not a directory`,
    );
  }
  return normalizeDirectoryWrapper(
    client,
    requestedPath,
    payload as GiteaContentsExtPayload<TVersion>,
  );
}

/**
 * List one exact directory by default. Recursive and single-folder traversal require `maxDepth`
 * and never inspect descendants beyond that explicit depth.
 */
export async function listGiteaDirectory<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  path: string,
  options: ListDirectoryOptions = {},
): Promise<readonly ContentData<"gitea", TVersion>[]> {
  const operation = { universal: "listDirectory", native: "repoGetContentsExt" } as const;
  const requestedPath = normalizeDirectoryPath(context, "listDirectory", path);
  const traverses = options.recursive === true || options.collapseSingleFolders === true;
  const maxDepth = traverses
    ? requirePositiveInteger(
      options.maxDepth ?? 0,
      "maximum directory depth",
      validationContext(context, "listDirectory"),
    )
    : 0;
  const maxItems = options.recursive === true
    ? requirePositiveInteger(
      options.maxItems ?? 0,
      "maximum directory items",
      validationContext(context, "listDirectory"),
    )
    : undefined;
  const client = await context.client();
  let directoryPath = requestedPath;
  let depth = 0;
  let entries = await readDirectoryEntries(
    context,
    client,
    repository,
    directoryPath,
    options.ref,
    operation,
    options.signal,
  );

  if (options.collapseSingleFolders === true) {
    while (depth < maxDepth && entries.length === 1 && contentKind(entries[0]) === "directory") {
      directoryPath = requiredText(entries[0].path, "collapsed directory path");
      depth++;
      entries = await readDirectoryEntries(
        context,
        client,
        repository,
        directoryPath,
        options.ref,
        operation,
        options.signal,
      );
    }
  }

  const normalized = entries.map((entry) =>
    normalizeGiteaContent(
      context,
      client,
      entry as GiteaEntityPayload<TVersion, "content">,
      false,
    )
  );
  if (options.recursive !== true) return Object.freeze(normalized);
  if (normalized.length > maxItems!) {
    throw directoryLimit(context, maxItems!, normalized.length);
  }

  const output = [...normalized];
  const queue = normalized
    .filter((entry) => entry.kind === "directory")
    .map((entry) => ({ path: entry.path, depth: depth + 1 }));
  while (queue.length > 0) {
    const currentDepth = queue[0].depth;
    const level: { path: string; depth: number }[] = [];
    while (queue[0]?.depth === currentDepth) level.push(queue.shift()!);
    if (currentDepth > maxDepth) continue;
    const groups = await mapGiteaBounded(
      context,
      operation,
      level,
      boundedConcurrency(context, "listDirectory", options.concurrency),
      options.signal,
      (entry, _index, workerSignal) =>
        readDirectoryEntries(
          context,
          client,
          repository,
          entry.path,
          options.ref,
          operation,
          workerSignal,
        ),
    );
    for (let group = 0; group < groups.length; group++) {
      for (const payload of groups[group]) {
        const child = normalizeGiteaContent(
          context,
          client,
          payload as GiteaEntityPayload<TVersion, "content">,
          false,
        );
        if (output.length === maxItems) {
          throw directoryLimit(context, maxItems!, output.length);
        }
        output.push(child);
        if (child.kind === "directory") {
          queue.push({ path: child.path, depth: level[group].depth + 1 });
        }
      }
    }
  }
  return Object.freeze(output);
}

async function readDirectoryEntries<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  path: string,
  ref: string | undefined,
  operation: GiteaOperationIdentity,
  signal?: AbortSignal,
): Promise<readonly AnyGiteaContent[]> {
  const payload = await getContentsExt(
    context,
    client,
    repository,
    path,
    ref,
    { includeBytes: false, includeCommitMetadata: false },
    operation,
    signal,
  );
  if (payload.dir_contents == null) {
    throw validationError(context, "listDirectory", `${displayPath(path)} is not a directory`);
  }
  return payload.dir_contents;
}

export async function readOptionalDirectoryEntries<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  path: string,
  ref: string,
  operation: GiteaOperationIdentity,
  signal?: AbortSignal,
): Promise<readonly AnyGiteaContent[]> {
  const payload = await requestOptionalGiteaBody<AnyGiteaContentsExt, TVersion>(
    context,
    operation,
    () =>
      client.repoGetContentsExt(
        {
          path: { ...repositoryPath(repository), filepath: providerContentPath(path) },
          query: { ref, includes: "commit_metadata" },
        },
        requestOptions(signal),
      ),
    signal,
    isContentsExt,
  );
  if (payload === undefined) return Object.freeze([]);
  if (payload.dir_contents == null) {
    throw invariant(
      context,
      operation.universal,
      `${displayPath(path)} did not return a directory listing`,
      payload,
    );
  }
  return payload.dir_contents;
}

export function normalizeDirectoryWrapper<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  requestedPath: string,
  payload: GiteaContentsExtPayload<TVersion>,
): ContentData<"gitea", TVersion> {
  const path = requestedPath.replace(/^\/+|\/+$/g, "");
  return Object.freeze({
    kind: "directory",
    path,
    name: baseName(path),
    native: createGiteaContentsExtNative(client, path, payload),
  });
}

function directoryLimit<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  maximum: number,
  inspected: number,
): OperationTimeoutError {
  return new OperationTimeoutError(
    `recursive directory traversal reached the ${maximum} item limit after ${inspected} entries`,
    {
      provider: "gitea",
      version: context.version,
      operation: "listDirectory",
    },
  );
}
