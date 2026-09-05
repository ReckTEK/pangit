import { NotFoundError } from "../../../fluent-api/adapter-contract/errors.ts";
import type {
  ContentReadResult,
  ReadFilesOptions,
} from "../../../fluent-api/adapter-contract/content.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoClient, ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import { type ForgejoOperationIdentity, mapForgejoBounded } from "../transport/response/mod.ts";
import { validateBatchPaths, validationError } from "./validation.ts";
import { boundedConcurrency } from "./batch.ts";
import { getContents } from "./get-contents.ts";
import { isContentArray } from "./validate-payload.ts";
import { readForgejoContent } from "./read-file.ts";
import type { AnyForgejoContent } from "./payload-types.ts";

/** Bound a single atomic mutation independently of read concurrency. */
export const FORGEJO_CONTENT_BATCH_SIZE = 50;

export async function readForgejoFiles<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V>,
  paths: readonly string[],
  options: ReadFilesOptions = {},
): Promise<readonly ContentReadResult<"forgejo", V>[]> {
  return await readFilesInternal(context, repository, paths, options, true, "readFiles");
}

/** Deduplicate requests and preserve input ordering, multiplicity, and individual absence. */
export async function readFilesInternal<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  repository: RepositoryData<"forgejo", V>,
  paths: readonly string[],
  options: ReadFilesOptions,
  includeBytes: boolean,
  operation: "readFiles" | "readPathMetadataBatch",
): Promise<readonly ContentReadResult<"forgejo", V>[]> {
  const validated = validateBatchPaths(context, operation, paths, options.maxItems);
  const unique = [...new Set(validated)];
  const results = await mapForgejoBounded(
    context,
    { universal: operation, native: "repoGetContents" },
    unique,
    boundedConcurrency(context, operation, options.concurrency),
    options.signal,
    async (path, _index, signal): Promise<ContentReadResult<"forgejo", V>> => {
      try {
        const content = await readForgejoContent(context, repository, path, {
          ...options,
          signal,
          includeBytes,
        });
        return Object.freeze({
          path,
          content,
          ...(content.kind === "file" ? {} : { unavailable: "not-a-file" as const }),
        });
      } catch (error) {
        if (error instanceof NotFoundError) return Object.freeze({ path, unavailable: "missing" });
        throw error;
      }
    },
  );
  const byPath = new Map(unique.map((path, index) => [path, results[index]]));
  return Object.freeze(validated.map((path) => byPath.get(path)!));
}

/** Read only mutation source paths, with bounded concurrency and 404-only absence. */
export async function readOneFileBatch<V extends ForgejoVersion>(
  context: ForgejoAdapterContext<V>,
  client: ForgejoClient<V>,
  repository: RepositoryData<"forgejo", V>,
  paths: readonly string[],
  ref: string | undefined,
  operation: ForgejoOperationIdentity,
  signal?: AbortSignal,
): Promise<readonly (AnyForgejoContent | null)[]> {
  return await mapForgejoBounded(
    context,
    operation,
    paths,
    4,
    signal,
    async (path, _index, workerSignal) => {
      try {
        const payload = await getContents(
          context,
          client,
          repository,
          path,
          ref,
          operation,
          workerSignal,
        );
        if (isContentArray(payload) || payload.type !== "file") {
          throw validationError(
            context,
            operation.universal,
            `required existing path ${path} is not a file`,
          );
        }
        return payload;
      } catch (error) {
        if (error instanceof NotFoundError) return null;
        throw error;
      }
    },
  );
}
