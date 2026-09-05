import type { GiteaProviderTypes } from "../provider-types.ts";
import { NotFoundError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ContentReadResult,
  ReadPathMetadataBatchOptions,
} from "../../../fluent-api/adapter-contract/content.ts";

import { requireIdentity } from "../../../fluent-api/adapter-contract/operation-options.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { getGiteaCommit } from "../commits/mod.ts";
import type { GiteaAdapterContext } from "../transport/GiteaAdapterContext.ts";
import type { GiteaEntityPayload, GiteaVersion } from "../native/GiteaEntityNative.ts";
import { mapGiteaBounded } from "../transport/response/mod.ts";
import { invariant, validateBatchPaths, validationContext, validationError } from "./validation.ts";
import { readFilesInternal } from "./read-files.ts";

import { directoryName } from "./paths.ts";
import { boundedConcurrency } from "./batch.ts";
import { readOptionalDirectoryEntries } from "./read-directory.ts";
import { contentKind, normalizeGiteaContent } from "./normalize-content.ts";
import { optionalText, requiredText } from "./validate-payload.ts";
import type { AnyGiteaContent } from "./payload-types.ts";

/**
 * Read path metadata in bounded batches. First-parent comparison resolves the commit once and
 * reads only the unique parent directories needed for the requested paths at the two revisions.
 */
export async function readGiteaPathMetadataBatch<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion, GiteaProviderTypes>,
  paths: readonly string[],
  options: ReadPathMetadataBatchOptions = {},
): Promise<readonly ContentReadResult<"gitea", TVersion, GiteaProviderTypes>[]> {
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

export function indexBatchShas<TVersion extends GiteaVersion>(
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
