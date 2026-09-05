import type { ForgejoProviderTypes } from "../provider-types.ts";
import type {
  CommitRefData,
  FindCommitRefsRequest,
} from "../../../fluent-api/adapter-contract/commits.ts";

import {
  requireIdentity,
  requirePositiveInteger,
} from "../../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  resolveBoundedPageLimit,
} from "../../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../../fluent-api/adapter-contract/repositories.ts";
import { listForgejoBranches } from "../branches/mod.ts";
import type { ForgejoAdapterContext } from "../transport/ForgejoAdapterContext.ts";
import type { ForgejoVersion } from "../native/ForgejoEntityNative.ts";
import {
  decodeForgejoPageCursor,
  type ForgejoOperationIdentity,
  mapForgejoBounded,
} from "../transport/response/mod.ts";
import { listForgejoTags } from "../tags/mod.ts";
import { boundedConcurrency } from "./request-options.ts";
import { countForgejoReachableCommits } from "./count-reachable.ts";
import { validationError } from "./errors.ts";

/** Inspect one branch/tag page and optionally test ancestry only for candidates in that page. */
export async function findForgejoRefsForCommit<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  repository: RepositoryData<"forgejo", TVersion, ForgejoProviderTypes>,
  sha: string,
  request: FindCommitRefsRequest,
): Promise<Page<CommitRefData>> {
  const operation = { universal: "findRefsForCommit" } as const;
  const branchOperation = {
    universal: "findRefsForCommit",
    native: "repoListBranches",
  } as const;
  const ancestryOperation = {
    universal: "findRefsForCommit",
    native: "repoGetAllCommits",
  } as const;
  const commitSha = requireIdentity(sha, "commit SHA");
  const kinds = validateRefKinds(context, request.kinds, operation);
  const cursor = decodeRefCursor(context, request.cursor, kinds, operation);
  const limit = resolveBoundedPageLimit(
    request,
    decodeForgejoPageCursor(cursor.providerCursor, {
      version: context.version,
      operation,
    }).effectiveLimit,
    { provider: "forgejo", version: context.version, operation: operation.universal },
  );
  if (request.match === "contains") {
    // The universal fallback bound remains required. Forgejo answers each candidate with a
    // count-only limit=1 probe, so it never downloads that many commit objects.
    requirePositiveInteger(
      request.maxCommitsPerRef ?? 0,
      "maximum commits per candidate ref",
    );
  }
  const kind = kinds[cursor.kindIndex];
  const pageRequest = {
    limit,
    ...(cursor.providerCursor === undefined ? {} : { cursor: cursor.providerCursor }),
    ...(request.signal === undefined ? {} : { signal: request.signal }),
  };
  const page = kind === "branch"
    ? await listForgejoBranches(context, repository, pageRequest, branchOperation)
    : await listForgejoTags(context, repository, pageRequest);
  const candidates: readonly CommitRefData[] = page.items.map((item) =>
    Object.freeze({ kind, name: item.name, sha: item.sha })
  );
  const items = request.match === "head"
    ? candidates.filter((candidate) => candidate.sha === commitSha)
    : (await mapForgejoBounded(
      context,
      ancestryOperation,
      candidates,
      boundedConcurrency(request.concurrency),
      request.signal,
      async (candidate, _index, workerSignal) =>
        await countForgejoReachableCommits(
            context,
            repository,
            commitSha,
            candidate.sha,
            { ...request, signal: workerSignal },
            ancestryOperation,
          ) === 0
          ? candidate
          : undefined,
    )).filter((candidate): candidate is CommitRefData => candidate !== undefined);
  const nextCursor = page.nextCursor !== undefined
    ? encodeRefCursor(kind, page.nextCursor)
    : cursor.kindIndex + 1 < kinds.length
    ? encodeRefCursor(kinds[cursor.kindIndex + 1])
    : undefined;
  return createPage(items, nextCursor === undefined ? {} : { nextCursor });
}

function validateRefKinds<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  values: readonly ("branch" | "tag")[],
  operation: ForgejoOperationIdentity,
): readonly ("branch" | "tag")[] {
  if (values.length === 0) {
    throw validationError(context, operation, "at least one ref kind is required");
  }
  const kinds = [...new Set(values)];
  if (kinds.length !== values.length) {
    throw validationError(context, operation, "ref kinds must not contain duplicates");
  }
  return Object.freeze(kinds);
}

interface RefCursor {
  readonly kindIndex: number;
  readonly providerCursor?: string;
}

function decodeRefCursor<TVersion extends ForgejoVersion>(
  context: ForgejoAdapterContext<TVersion>,
  value: string | undefined,
  kinds: readonly ("branch" | "tag")[],
  operation: ForgejoOperationIdentity,
): RefCursor {
  if (value === undefined) return Object.freeze({ kindIndex: 0 });
  const match = /^forgejo-refs:(branch|tag)(?::(.+))?$/.exec(value);
  if (match === null) {
    throw validationError(context, operation, "invalid Forgejo ref cursor");
  }
  const kind = match[1] as "branch" | "tag";
  const kindIndex = kinds.indexOf(kind);
  if (kindIndex < 0) {
    throw validationError(
      context,
      operation,
      `cursor ref kind ${kind} is not present in this request`,
    );
  }
  let providerCursor: string | undefined;
  if (match[2] !== undefined) {
    try {
      providerCursor = decodeURIComponent(match[2]);
      decodeForgejoPageCursor(providerCursor, {
        version: context.version,
        operation: {
          universal: operation.universal,
          native: kind === "branch" ? "repoListBranches" : "repoListTags",
        },
      });
    } catch (cause) {
      throw validationError(context, operation, "invalid Forgejo ref cursor", cause);
    }
  }
  return Object.freeze({ kindIndex, ...(providerCursor === undefined ? {} : { providerCursor }) });
}

function encodeRefCursor(kind: "branch" | "tag", providerCursor?: string): string {
  return `forgejo-refs:${kind}${
    providerCursor === undefined ? "" : `:${encodeURIComponent(providerCursor)}`
  }`;
}
