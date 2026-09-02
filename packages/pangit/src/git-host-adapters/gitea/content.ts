import {
  ConflictError,
  ContentUnavailableError,
  NotFoundError,
  OperationTimeoutError,
  ProviderInvariantError,
  ValidationError,
} from "../../fluent-api/adapter-contract/errors.ts";
import {
  type CommitFileChangesInput,
  type CommitFileChangesOptions,
  type ContentData,
  type ContentReadResult,
  DEFAULT_CONTENT_BATCH_MAX_ITEMS,
  type FileChange,
  type ListDirectoryOptions,
  type ReadContentOptions,
  type ReadFilesOptions,
  type ReadLinkedContentOptions,
  type ReadPathMetadataBatchOptions,
  type RepositoryContentKind,
} from "../../fluent-api/adapter-contract/content.ts";
import type { CommitData, GitActor } from "../../fluent-api/adapter-contract/commits.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import { getGiteaCommit } from "./commits.ts";
import type { GiteaAdapterContext } from "./GiteaAdapterContext.ts";
import {
  createGiteaContentsExtNative,
  createGiteaContentsListNative,
  createGiteaEntityNative,
  createGiteaFilesResponseCommitNative,
  type GiteaClient,
  type GiteaContentsExtPayload,
  type GiteaEntityPayload,
  type GiteaFilesResponsePayload,
  type GiteaVersion,
} from "./native/GiteaEntityNative.ts";
import {
  type GiteaOperationIdentity,
  mapGiteaBounded,
  requestGiteaBody,
  requestOptionalGiteaBody,
} from "./response.ts";

type AnyGiteaContent = GiteaEntityPayload<GiteaVersion, "content">;
type AnyGiteaContentsExt = GiteaContentsExtPayload<GiteaVersion>;
type AnyGiteaFilesResponse = GiteaFilesResponsePayload<GiteaVersion>;

/** Conservative batch size until both pinned Gitea versions publish a live-proven larger limit. */
export const GITEA_CONTENT_BATCH_SIZE = 50;
/** Content reads never fan out beyond this provider concurrency ceiling. */
export const GITEA_CONTENT_MAX_CONCURRENCY = 4;

/** Read one exact path with one contents-ext request and no external dereferencing. */
export async function readGiteaContent<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  path: string,
  options: ReadContentOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "readContent",
    native: "repoGetContentsExt",
  },
): Promise<ContentData<"gitea", TVersion>> {
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
    );
  }
  return normalizeDirectoryWrapper(
    client,
    requestedPath,
    payload as GiteaContentsExtPayload<TVersion>,
  );
}

/** Batch only requested unique paths, then reconstruct duplicates in stable input order. */
export async function readGiteaFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  paths: readonly string[],
  options: ReadFilesOptions = {},
): Promise<readonly ContentReadResult<"gitea", TVersion>[]> {
  return await readFilesInternal(context, repository, paths, options, true, "readFiles");
}

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

/**
 * Read path metadata in bounded batches. First-parent comparison resolves the commit once and
 * reads only the unique parent directories needed for the requested paths at the two revisions.
 */
export async function readGiteaPathMetadataBatch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  paths: readonly string[],
  options: ReadPathMetadataBatchOptions = {},
): Promise<readonly ContentReadResult<"gitea", TVersion>[]> {
  const operation = {
    universal: "readPathMetadataBatch",
    native: "repoGetContentsExt",
  } as const;
  const validated = validateBatchPaths(context, "readPathMetadataBatch", paths, options.maxItems);
  if (options.compareFirstParent !== true) {
    return await readFilesInternal(
      context,
      repository,
      validated,
      options,
      false,
      "readPathMetadataBatch",
    );
  }
  if (validated.length === 0) return Object.freeze([]);
  const ref = options.ref ?? repository.defaultBranch;
  if (ref === undefined) {
    throw validationError(
      context,
      "readPathMetadataBatch",
      "repository has no known default branch; provide an explicit ref",
    );
  }
  const commit = await getGiteaCommit(
    context,
    repository,
    requireIdentity(
      ref,
      "metadata ref",
      validationContext(context, "readPathMetadataBatch"),
    ),
    {
      signal: options.signal,
      files: false,
      stats: false,
      verification: false,
    },
  );
  const parent = commit.parents[0];
  const client = await context.client();
  const prefixes = [...new Set(validated.map(directoryName))];
  const concurrency = boundedConcurrency(context, "readPathMetadataBatch", options.concurrency);
  const pairs = await mapGiteaBounded(
    context,
    operation,
    prefixes,
    concurrency,
    options.signal,
    async (prefix, _index, workerSignal) => {
      const current = await readOptionalDirectoryEntries(
        context,
        client,
        repository,
        prefix,
        commit.sha,
        operation,
        workerSignal,
      );
      const previous = parent === undefined ? [] : await readOptionalDirectoryEntries(
        context,
        client,
        repository,
        prefix,
        parent,
        operation,
        workerSignal,
      );
      return { prefix, current, previous };
    },
  );
  const currentByPath = indexContentPayloads(
    context,
    "readPathMetadataBatch",
    pairs.flatMap((pair) => pair.current),
  );
  const previousByPath = indexContentPayloads(
    context,
    "readPathMetadataBatch",
    pairs.flatMap((pair) => pair.previous),
  );
  return Object.freeze(validated.map((path) => {
    const payload = currentByPath.get(path);
    if (payload === undefined) return Object.freeze({ path, unavailable: "missing" as const });
    const content = normalizeGiteaContent(
      context,
      client,
      payload as GiteaEntityPayload<TVersion, "content">,
      false,
    );
    const firstParentObjectSha = optionalText(previousByPath.get(path)?.sha);
    return Object.freeze({
      path,
      content: firstParentObjectSha === undefined
        ? content
        : Object.freeze({ ...content, firstParentSha: firstParentObjectSha }),
    });
  }));
}

/** Return one raw symlink target; never follow it. */
export async function readGiteaSymlink<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  path: string,
  options: ReadLinkedContentOptions = {},
): Promise<ContentData<"gitea", TVersion>> {
  const operation = { universal: "readSymlink", native: "repoGetContentsExt" } as const;
  const content = await readGiteaContent(
    context,
    repository,
    path,
    {
      ...options,
      includeBytes: false,
    },
    operation,
  );
  if (content.kind !== "symlink") {
    throw validationError(context, "readSymlink", `${displayPath(path)} is not a symlink`);
  }
  if (options.dereference !== "internal") return content;
  const targetPath = resolveInternalSymlinkPath(context, content.path, content.target!);
  const dereferenced = await readGiteaContent(
    context,
    repository,
    targetPath,
    {
      ref: options.ref,
      includeBytes: options.includeBytes,
      includeCommitMetadata: options.includeCommitMetadata,
      signal: options.signal,
    },
    operation,
  );
  return Object.freeze({ ...content, dereferenced });
}

/** Return one submodule URL/SHA metadata record; never contact its remote. */
export async function readGiteaSubmodule<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  path: string,
  options: ReadLinkedContentOptions = {},
): Promise<ContentData<"gitea", TVersion>> {
  const operation = { universal: "readSubmodule", native: "repoGetContentsExt" } as const;
  const content = await readGiteaContent(
    context,
    repository,
    path,
    {
      ...options,
      includeBytes: false,
    },
    operation,
  );
  if (content.kind !== "submodule") {
    throw validationError(context, "readSubmodule", `${displayPath(path)} is not a submodule`);
  }
  if (options.dereference !== "internal") return content;
  const targetRepository = parseInternalSubmoduleRepository(
    context,
    content.submoduleUrl!,
  );
  const targetSha = requireIdentity(
    content.sha ?? "",
    "submodule commit SHA",
    validationContext(context, "readSubmodule"),
  );
  const client = await context.client();
  const entries = await requestGiteaBody<readonly AnyGiteaContent[], TVersion>(
    context,
    { universal: "readSubmodule", native: "repoGetContentsList" },
    () =>
      client.repoGetContentsList(
        {
          path: repositoryPath(targetRepository),
          query: { ref: targetSha },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isContentArray,
  );
  return Object.freeze({
    ...content,
    dereferenced: Object.freeze({
      kind: "directory",
      path: "",
      name: "",
      native: createGiteaContentsListNative(
        client,
        entries as readonly GiteaEntityPayload<TVersion, "content">[],
      ),
    }),
  });
}

/**
 * Commit one validated file batch with one mutation and at most one batch SHA pre-read.
 */
export async function commitGiteaFileChanges<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  input: CommitFileChangesInput,
  options: CommitFileChangesOptions<"gitea"> = {},
): Promise<CommitData<"gitea", TVersion>> {
  const preReadOperation = {
    universal: "commitFileChanges",
    native: "repoGetFileContentsPost",
  } as const;
  const mutationOperation = {
    universal: "commitFileChanges",
    native: "repoChangeFiles",
  } as const;
  const inputContext = validationContext(context, "commitFileChanges");
  const branch = requireIdentity(input.branch, "file-change branch", inputContext);
  const newBranch = input.newBranch === undefined
    ? undefined
    : requireIdentity(input.newBranch, "new file-change branch", inputContext);
  const message = requireIdentity(input.message, "file-change commit message", inputContext);
  if (newBranch === branch) {
    throw validationError(
      context,
      "commitFileChanges",
      "new file-change branch must differ from the base branch",
    );
  }
  const changes = validateFileChanges(context, input.changes);
  if (changes.length > GITEA_CONTENT_BATCH_SIZE) {
    throw validationError(
      context,
      "commitFileChanges",
      `file-change batch exceeds the conservative ${GITEA_CONTENT_BATCH_SIZE} item limit`,
    );
  }
  const extension = options.extension;
  const author = normalizeWriteActor(context, input.author, "author");
  const committer = normalizeWriteActor(context, extension?.committer, "committer");
  const authorDate = extension?.authorDate === undefined
    ? author.date
    : requireIdentity(extension.authorDate, "author date", inputContext);
  const committerDate = extension?.committerDate === undefined
    ? committer.date
    : requireIdentity(extension.committerDate, "committer date", inputContext);
  const client = await context.client();
  const existingPaths = [
    ...new Set(
      changes.filter((change) => change.needsSha).map((change) => change.existingPath),
    ),
  ];
  let shaByPath = new Map<string, string>();
  if (existingPaths.length > 0) {
    const preRead = await readOneFileBatch(
      context,
      client,
      repository,
      existingPaths,
      branch,
      preReadOperation,
      options.signal,
    );
    shaByPath = indexBatchShas(context, existingPaths, preRead);
    for (const change of changes) {
      if (change.sha === undefined) continue;
      const currentSha = shaByPath.get(change.existingPath);
      if (currentSha !== change.sha) {
        throw new ConflictError(
          `file ${change.existingPath} changed since its expected SHA was read`,
          {
            provider: "gitea",
            version: context.version,
            operation: "commitFileChanges",
          },
        );
      }
    }
  }
  const payload = await requestGiteaBody<AnyGiteaFilesResponse, TVersion>(
    context,
    mutationOperation,
    () =>
      client.repoChangeFiles(
        {
          path: repositoryPath(repository),
          body: {
            mediaType: "application/json",
            value: {
              branch,
              ...(newBranch === undefined ? {} : { new_branch: newBranch }),
              message,
              ...(author.identity === undefined ? {} : { author: author.identity }),
              ...(committer.identity === undefined ? {} : { committer: committer.identity }),
              ...(authorDate === undefined && committerDate === undefined ? {} : {
                dates: {
                  ...(authorDate === undefined ? {} : { author: authorDate }),
                  ...(committerDate === undefined ? {} : { committer: committerDate }),
                },
              }),
              ...(extension?.forcePush === undefined ? {} : { force_push: extension.forcePush }),
              ...(extension?.signoff === undefined ? {} : { signoff: extension.signoff }),
              files: changes.map((change) => {
                const sha = change.sha ?? shaByPath.get(change.existingPath);
                return {
                  operation: change.operation,
                  path: change.path,
                  ...(change.fromPath === undefined ? {} : { from_path: change.fromPath }),
                  ...(change.content === undefined ? {} : { content: change.content }),
                  ...(sha === undefined ? {} : { sha }),
                };
              }),
            },
          },
        },
        requestOptions(options.signal),
      ),
    options.signal,
    isFilesResponse,
  );
  return normalizeFilesResponseCommit(
    client,
    payload as GiteaFilesResponsePayload<TVersion>,
  );
}

/** Normalize one exact generated content payload without fetching any linked URL. */
export function normalizeGiteaContent<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  payload: GiteaEntityPayload<TVersion, "content">,
  includeBytes: boolean,
): ContentData<"gitea", TVersion> {
  const kind = contentKind(payload);
  const path = requiredText(payload.path, "content path");
  const name = requiredText(payload.name, `content ${path} name`);
  const sha = optionalText(payload.sha);
  const size = optionalNonNegativeInteger(payload.size);
  const lastCommitSha = optionalText(payload.last_commit_sha);
  const bytes = includeBytes && kind === "file"
    ? decodeContentBytes(context, payload, path)
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

async function readFilesInternal<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  paths: readonly string[],
  options: ReadFilesOptions,
  includeBytes: boolean,
  operation: "readFiles" | "readPathMetadataBatch",
): Promise<readonly ContentReadResult<"gitea", TVersion>[]> {
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
  const results = new Map<string, ContentReadResult<"gitea", TVersion>>();
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

async function getContentsExt<TVersion extends GiteaVersion>(
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

async function readOptionalDirectoryEntries<TVersion extends GiteaVersion>(
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

async function readOneFileBatch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  client: GiteaClient<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
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

function normalizeBatchRead<TVersion extends GiteaVersion>(
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

function normalizeDirectoryWrapper<TVersion extends GiteaVersion>(
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

function normalizeFilesResponseCommit<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  payload: GiteaFilesResponsePayload<TVersion>,
): CommitData<"gitea", TVersion> {
  if (!isRecord(payload.commit)) throw new TypeError("file-change response has no commit");
  const sha = requiredText(payload.commit.sha, "file-change commit SHA");
  const message = requiredText(payload.commit.message, `file-change commit ${sha} message`);
  const parents = payload.commit.parents === undefined
    ? []
    : payload.commit.parents.map((parent) =>
      requiredText(parent.sha, `file-change commit ${sha} parent SHA`)
    );
  const verified = typeof payload.verification?.verified === "boolean"
    ? payload.verification.verified
    : undefined;
  const url = optionalText(payload.commit.html_url) ?? optionalText(payload.commit.url);
  const author = normalizeActor(payload.commit.author);
  const committer = normalizeActor(payload.commit.committer);
  return Object.freeze({
    sha,
    message,
    ...(url === undefined ? {} : { url }),
    ...(author === undefined ? {} : { author }),
    ...(committer === undefined ? {} : { committer }),
    parents: Object.freeze(parents),
    ...(verified === undefined ? {} : { verified }),
    native: createGiteaFilesResponseCommitNative(client, payload),
  });
}

interface ValidatedChange {
  readonly operation: "create" | "delete" | "rename" | "update" | "upload";
  readonly path: string;
  readonly existingPath: string;
  readonly fromPath?: string;
  readonly content?: string;
  readonly sha?: string;
  readonly needsSha: boolean;
}

function validateFileChanges<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  changes: readonly FileChange[],
): readonly ValidatedChange[] {
  if (changes.length === 0) {
    throw validationError(context, "commitFileChanges", "file-change batch cannot be empty");
  }
  const destinations = new Set<string>();
  const sources = new Set<string>();
  const errorContext = validationContext(context, "commitFileChanges");
  const validated = changes.map((change): ValidatedChange => {
    const path = requireIdentity(change.path, "file-change path", errorContext);
    if (destinations.has(path)) {
      throw validationError(
        context,
        "commitFileChanges",
        `file-change path ${path} appears more than once`,
      );
    }
    destinations.add(path);
    const sha = "sha" in change && change.sha !== undefined
      ? requireIdentity(change.sha, "file SHA", errorContext)
      : undefined;
    switch (change.operation) {
      case "create":
        return {
          operation: "create",
          path,
          existingPath: path,
          content: encodeContent(change.content),
          needsSha: false,
        };
      case "upsert":
        return {
          operation: "upload",
          path,
          existingPath: path,
          content: encodeContent(change.content),
          needsSha: false,
        };
      case "update":
        sources.add(path);
        return {
          operation: "update",
          path,
          existingPath: path,
          content: encodeContent(change.content),
          ...(sha === undefined ? {} : { sha }),
          needsSha: true,
        };
      case "delete":
        sources.add(path);
        return {
          operation: "delete",
          path,
          existingPath: path,
          ...(sha === undefined ? {} : { sha }),
          needsSha: true,
        };
      case "move": {
        const fromPath = requireIdentity(
          change.fromPath,
          "moved file source path",
          errorContext,
        );
        if (fromPath === path) {
          throw validationError(
            context,
            "commitFileChanges",
            `moved file source and destination are both ${path}`,
          );
        }
        if (sources.has(fromPath)) {
          throw validationError(
            context,
            "commitFileChanges",
            `file-change source ${fromPath} appears more than once`,
          );
        }
        sources.add(fromPath);
        return {
          operation: "rename",
          path,
          existingPath: fromPath,
          fromPath,
          ...(sha === undefined ? {} : { sha }),
          needsSha: true,
        };
      }
    }
  });
  for (const change of validated) {
    if (change.operation === "rename" && destinations.has(change.existingPath)) {
      throw validationError(
        context,
        "commitFileChanges",
        `file-change source ${change.existingPath} conflicts with another destination`,
      );
    }
  }
  return Object.freeze(validated);
}

function indexBatchShas<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  paths: readonly string[],
  payloads: readonly (AnyGiteaContent | null)[],
): Map<string, string> {
  const byPath = new Map<string, string>();
  for (const payload of payloads) {
    if (payload === null) continue;
    const path = requiredText(payload.path, "pre-read content path");
    if (!paths.includes(path) || byPath.has(path)) {
      throw invariant(
        context,
        "repoGetFileContentsPost",
        `pre-read returned unexpected or duplicate path ${path}`,
        payloads,
      );
    }
    if (contentKind(payload) !== "file") {
      throw validationError(
        context,
        "commitFileChanges",
        `required existing path ${path} is not a file`,
      );
    }
    const sha = optionalText(payload.sha);
    if (sha === undefined || sha.trim().length === 0) {
      throw invariant(
        context,
        "repoGetFileContentsPost",
        `pre-read content ${path} has no SHA`,
        payload,
      );
    }
    byPath.set(path, sha);
  }
  for (let index = 0; index < paths.length; index++) {
    const path = paths[index];
    const positional = payloads[index];
    if (positional !== null && positional !== undefined && positional.path === path) {
      const sha = optionalText(positional.sha);
      if (sha === undefined || sha.trim().length === 0) {
        throw invariant(
          context,
          "repoGetFileContentsPost",
          `pre-read content ${path} has no SHA`,
          positional,
        );
      }
      byPath.set(path, sha);
    }
    if (!byPath.has(path)) {
      throw new NotFoundError(`required existing file ${path} was not found`, {
        provider: "gitea",
        version: context.version,
        operation: "commitFileChanges",
      });
    }
  }
  return byPath;
}

function indexContentPayloads<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  payloads: readonly AnyGiteaContent[],
): Map<string, AnyGiteaContent> {
  const result = new Map<string, AnyGiteaContent>();
  for (const payload of payloads) {
    const path = requiredText(payload.path, "content path");
    if (result.has(path)) throw invariant(context, operation, `duplicate content path ${path}`);
    result.set(path, payload);
  }
  return result;
}

function decodeContentBytes<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  payload: AnyGiteaContent,
  path: string,
): Uint8Array {
  if (payload.content == null) {
    if ((optionalNonNegativeInteger(payload.size) ?? 0) > 0) {
      throw new ContentUnavailableError(`content bytes for ${path} exceed the Gitea API limit`, {
        provider: "gitea",
        version: context.version,
        operation: "readContent",
      });
    }
    throw invariant(context, "readContent", `file ${path} returned no encoded content`, payload);
  }
  if (payload.encoding !== "base64") {
    throw invariant(
      context,
      "readContent",
      `file ${path} returned unsupported encoding ${String(payload.encoding)}`,
      payload,
    );
  }
  const encoded = payload.content.replace(/\s/g, "");
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw invariant(context, "readContent", `file ${path} returned malformed base64`, payload);
  }
  try {
    return Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  } catch (cause) {
    throw invariant(context, "readContent", `file ${path} returned malformed base64`, cause);
  }
}

function validateBatchPaths<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  paths: readonly string[],
  requestedMax?: number,
): readonly string[] {
  const maxItems = requirePositiveInteger(
    requestedMax ?? DEFAULT_CONTENT_BATCH_MAX_ITEMS,
    "maximum content items",
    validationContext(context, operation),
  );
  if (paths.length > maxItems) {
    throw validationError(
      context,
      operation,
      `requested ${paths.length} paths, exceeding the ${maxItems} item limit`,
    );
  }
  return Object.freeze(
    paths.map((path) =>
      requireIdentity(path, "content path", validationContext(context, operation))
    ),
  );
}

function isContentsExt(value: unknown): value is AnyGiteaContentsExt {
  if (!isRecord(value)) return false;
  const hasFile = value.file_contents != null;
  const hasDirectory = value.dir_contents != null;
  if (hasFile === hasDirectory) return false;
  if (hasFile) return isContentPayload(value.file_contents);
  return Array.isArray(value.dir_contents) && value.dir_contents.every(isContentPayload);
}

function isFileBatchResponse(value: unknown): value is readonly (AnyGiteaContent | null)[] {
  return Array.isArray(value) && value.every((entry) => entry === null || isContentPayload(entry));
}

function isContentArray(value: unknown): value is readonly AnyGiteaContent[] {
  return Array.isArray(value) && value.every(isContentPayload);
}

function isFilesResponse(value: unknown): value is AnyGiteaFilesResponse {
  if (!isRecord(value) || !isRecord(value.commit)) return false;
  return hasText(value.commit.sha) && hasText(value.commit.message) &&
    (value.commit.parents === undefined ||
      Array.isArray(value.commit.parents) &&
        value.commit.parents.every((parent) => isRecord(parent) && hasText(parent.sha)));
}

function isContentPayload(value: unknown): value is AnyGiteaContent {
  if (!isRecord(value)) return false;
  if (!hasText(value.path) || !hasText(value.name)) return false;
  if (!["file", "dir", "symlink", "submodule"].includes(String(value.type))) return false;
  if (value.size !== undefined && optionalNonNegativeInteger(value.size) === undefined) {
    return false;
  }
  if (value.type === "symlink" && !hasText(value.target)) return false;
  if (value.type === "submodule" && !hasText(value.submodule_git_url)) return false;
  return true;
}

function contentKind(value: AnyGiteaContent): RepositoryContentKind {
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

function normalizeWriteActor<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  actor: GitActor | undefined,
  label: "author" | "committer",
): {
  readonly identity?: { readonly name?: string; readonly email?: string };
  readonly date?: string;
} {
  if (actor === undefined) return {};
  const errorContext = validationContext(context, "commitFileChanges");
  const name = actor.name === undefined
    ? undefined
    : requireIdentity(actor.name, `${label} name`, errorContext);
  const email = actor.email === undefined
    ? undefined
    : requireIdentity(actor.email, `${label} email`, errorContext);
  const date = actor.date === undefined
    ? undefined
    : requireIdentity(actor.date, `${label} date`, errorContext);
  if (name === undefined && email === undefined && date === undefined) {
    throw validationError(
      context,
      "commitFileChanges",
      `${label} must contain a name, email, or date`,
    );
  }
  return {
    ...(name === undefined && email === undefined ? {} : {
      identity: {
        ...(name === undefined ? {} : { name }),
        ...(email === undefined ? {} : { email }),
      },
    }),
    ...(date === undefined ? {} : { date }),
  };
}

function normalizeActor(value: unknown) {
  if (!isRecord(value)) return undefined;
  const name = optionalText(value.name);
  const email = optionalText(value.email);
  const date = optionalText(value.date);
  if (name === undefined && email === undefined && date === undefined) return undefined;
  return Object.freeze({
    ...(name === undefined ? {} : { name }),
    ...(email === undefined ? {} : { email }),
    ...(date === undefined ? {} : { date }),
  });
}

function encodeContent(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

function chunk<T>(values: readonly T[], size: number): readonly (readonly T[])[] {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

function boundedConcurrency<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value?: number,
): number {
  const errorContext = validationContext(context, operation);
  const requested = requirePositiveInteger(
    value ?? GITEA_CONTENT_MAX_CONCURRENCY,
    "concurrency",
    errorContext,
  );
  if (requested > GITEA_CONTENT_MAX_CONCURRENCY) {
    throw new ValidationError(
      `concurrency cannot exceed ${GITEA_CONTENT_MAX_CONCURRENCY}`,
      errorContext,
    );
  }
  return requested;
}

function normalizeDirectoryPath<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  value: string,
): string {
  if (value === "" || value === "." || value === "/") return "";
  return requireIdentity(
    value,
    "directory path",
    validationContext(context, operation),
  ).replace(/^\/+|\/+$/g, "");
}

function providerContentPath(value: string): string {
  return value.replace(/^\/+|\/+$/g, "") || ".";
}

function resolveInternalSymlinkPath<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  linkPath: string,
  target: string,
): string {
  if (target.startsWith("/") || /^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)) {
    throw validationError(
      context,
      "readSymlink",
      `symlink ${linkPath} points outside the repository`,
    );
  }
  const segments = [...directoryName(linkPath).split("/"), ...target.split("/")];
  const resolved: string[] = [];
  for (const segment of segments) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (resolved.length === 0) {
        throw validationError(
          context,
          "readSymlink",
          `symlink ${linkPath} escapes the repository root`,
        );
      }
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return requireIdentity(
    resolved.join("/"),
    "symlink target path",
    validationContext(context, "readSymlink"),
  );
}

function parseInternalSubmoduleRepository<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  submoduleUrl: string,
): { readonly owner: string; readonly name: string } {
  const providerRoot = context.webBaseUrl();
  let target: URL;
  try {
    target = new URL(submoduleUrl, providerRoot);
  } catch {
    throw validationError(context, "readSubmodule", "submodule URL is invalid");
  }
  if (target.origin !== providerRoot.origin) {
    throw validationError(
      context,
      "readSubmodule",
      "submodule dereference is restricted to this Gitea instance",
    );
  }
  const rootPath = providerRoot.pathname.replace(/^\/+|\/+$/g, "");
  const targetPath = target.pathname.replace(/^\/+|\/+$/g, "");
  const relativePath = rootPath.length === 0
    ? targetPath
    : targetPath.startsWith(`${rootPath}/`)
    ? targetPath.slice(rootPath.length + 1)
    : "";
  const segments = relativePath.replace(/\.git$/, "").split("/").filter(Boolean);
  if (segments.length !== 2) {
    throw validationError(
      context,
      "readSubmodule",
      "submodule URL is not a repository on this Gitea instance",
    );
  }
  return Object.freeze({
    owner: requireIdentity(
      decodeURIComponent(segments[0]),
      "submodule owner",
      validationContext(context, "readSubmodule"),
    ),
    name: requireIdentity(
      decodeURIComponent(segments[1]),
      "submodule repository",
      validationContext(context, "readSubmodule"),
    ),
  });
}

function directoryName(path: string): string {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  const separator = normalized.lastIndexOf("/");
  return separator < 0 ? "" : normalized.slice(0, separator);
}

function baseName(path: string): string {
  if (path === "") return ".";
  const separator = path.lastIndexOf("/");
  return separator < 0 ? path : path.slice(separator + 1);
}

function displayPath(path: string): string {
  return path === "" ? "repository root" : path;
}

function repositoryPath(repository: { readonly owner: string; readonly name: string }) {
  return {
    owner: requireIdentity(repository.owner, "repository owner"),
    repo: requireIdentity(repository.name, "repository name"),
  };
}

function requestOptions(signal?: AbortSignal): { readonly signal: AbortSignal } | undefined {
  return signal === undefined ? undefined : { signal };
}

function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
): ValidationError {
  return new ValidationError(message, validationContext(context, operation));
}

function validationContext<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
) {
  return {
    provider: "gitea",
    version: context.version,
    operation,
  } as const;
}

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: string,
  message: string,
  cause?: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(message, {
    provider: "gitea",
    version: context.version,
    operation,
    ...(cause === undefined ? {} : { cause }),
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

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
    ? Number(value)
    : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
