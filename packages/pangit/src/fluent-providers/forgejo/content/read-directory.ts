import type { ForgejoProviderTypes } from "../provider-types.ts";
import {
  NotFoundError,
  OperationTimeoutError,
} from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ContentData,
  ListDirectoryOptions,
  ReadContentOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import { requirePositiveInteger } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";

import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import {
  createForgejoContentsListNative,
  type ForgejoClient,
  type ForgejoEntityPayload,
  type ForgejoVersion,
} from "../native/ForgejoEntityNative.ts";
import { type ForgejoOperationIdentity, mapForgejoBounded } from "../transport/response/mod.ts";
import { baseName, displayPath, normalizeDirectoryPath } from "./paths.ts";
import { getContents } from "./get-contents.ts";
import { validationContext, validationError } from "./validation.ts";

import { contentKind, normalizeForgejoContent } from "./normalize-content.ts";
import { isContentArray, requiredText } from "./validate-payload.ts";

import { boundedConcurrency } from "./batch.ts";
import type { AnyForgejoContent } from "./payload-types.ts";

/** Require one direct contents result to be a directory and retain its exact wrapper. */
export async function getForgejoDirectory<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  path: string,
  options: ReadContentOptions = {},
): Promise<ContentData<"forgejo", TVersion, ForgejoProviderTypes>> {
  const operation = { universal: "getDirectory", native: "repoGetContents" } as const;
  const requestedPath = normalizeDirectoryPath(context, "getDirectory", path);
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
    throw validationError(
      context,
      "getDirectory",
      `${displayPath(requestedPath)} is not a directory`,
    );
  }
  return normalizeDirectoryWrapper(
    client,
    requestedPath,
    payload as readonly ForgejoEntityPayload<TVersion, "content">[],
  );
}

/**
 * List one exact directory by default. Recursive and single-folder traversal require `maxDepth`
 * and never inspect descendants beyond that explicit depth.
 */
export async function listForgejoDirectory<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  path: string,
  options: ListDirectoryOptions = {},
): Promise<readonly ContentData<"forgejo", TVersion, ForgejoProviderTypes>[]> {
  const operation = { universal: "listDirectory", native: "repoGetContents" } as const;
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
    normalizeForgejoContent(
      context,
      client,
      entry as ForgejoEntityPayload<TVersion, "content">,
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
    const groups = await mapForgejoBounded(
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
        const child = normalizeForgejoContent(
          context,
          client,
          payload as ForgejoEntityPayload<TVersion, "content">,
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

async function readDirectoryEntries<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  client: ForgejoClient<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  path: string,
  ref: string | undefined,
  operation: ForgejoOperationIdentity,
  signal?: AbortSignal,
): Promise<readonly AnyForgejoContent[]> {
  const payload = await getContents(
    context,
    client,
    repository,
    path,
    ref,
    operation,
    signal,
  );
  if (!isContentArray(payload)) {
    throw validationError(context, "listDirectory", `${displayPath(path)} is not a directory`);
  }
  return payload;
}

export async function readOptionalDirectoryEntries<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  client: ForgejoClient<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  path: string,
  ref: string,
  operation: ForgejoOperationIdentity,
  signal?: AbortSignal,
): Promise<readonly AnyForgejoContent[]> {
  try {
    return await readDirectoryEntries(context, client, repository, path, ref, operation, signal);
  } catch (error) {
    if (error instanceof NotFoundError) return Object.freeze([]);
    throw error;
  }
}

export function normalizeDirectoryWrapper<TVersion extends ForgejoVersion>(
  client: ForgejoClient<TVersion>,
  requestedPath: string,
  payload: readonly ForgejoEntityPayload<TVersion, "content">[],
): ContentData<"forgejo", TVersion, ForgejoProviderTypes> {
  const path = requestedPath.replace(/^\/+|\/+$/g, "");
  return Object.freeze({
    kind: "directory",
    path,
    name: baseName(path),
    native: createForgejoContentsListNative(client, payload, path),
  });
}

function directoryLimit<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  maximum: number,
  inspected: number,
): OperationTimeoutError {
  return new OperationTimeoutError(
    `recursive directory traversal reached the ${maximum} item limit after ${inspected} entries`,
    {
      provider: "forgejo",
      version: context.version,
      operation: "listDirectory",
    },
  );
}
