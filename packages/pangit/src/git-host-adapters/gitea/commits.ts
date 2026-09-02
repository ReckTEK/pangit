import type { AnyRestResponse } from "../../generated-rest-clients/runtime/mod.ts";
import { giteaOperations as gitea127Operations } from "../../generated-rest-clients/gitea/1.27.2/GiteaRestClient.ts";
import {
  IncompleteHistoryError,
  ProviderInvariantError,
  ValidationError,
} from "../../fluent-api/adapter-contract/errors.ts";
import {
  type CommitComparison,
  type CommitData,
  type CommitFacets,
  type CommitFileData,
  type CommitRefData,
  type CompareCommitsOptions,
  type ContributorData,
  DEFAULT_COMMIT_MULTI_GET_MAX_ITEMS,
  type FindCommitRefsRequest,
  type GetCommitOptions,
  type GetCommitsOptions,
  type GiteaCommitComparisonOutput,
  type GiteaCompareCommitsExtension,
  type ListCommitsRequest,
  type ListContributorsRequest,
  MAX_COMMIT_READ_CONCURRENCY,
  type MergeBaseOptions,
  type MergeBasesResult,
} from "../../fluent-api/adapter-contract/commits.ts";
import type { OperationOptions } from "../../fluent-api/adapter-contract/operation-options.ts";
import {
  requireIdentity,
  requirePositiveInteger,
} from "../../fluent-api/adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  type ScanPage,
} from "../../fluent-api/adapter-contract/pagination.ts";
import type { RepositoryData } from "../../fluent-api/adapter-contract/repositories.ts";
import { listGiteaBranches } from "./branches.ts";
import type { GiteaAdapterContext } from "./GiteaAdapterContext.ts";
import {
  createGiteaEntityNative,
  type GiteaClient,
  type GiteaEntityPayload,
  type GiteaVersion,
} from "./native/GiteaEntityNative.ts";
import {
  decodeGiteaPageCursor,
  type GiteaOperationIdentity,
  giteaPagination,
  mapGiteaBounded,
  requestGitea,
  requestGiteaBody,
  requestGiteaText,
} from "./response.ts";
import { listGiteaTags } from "./tags.ts";

type AnyGiteaCommit = GiteaEntityPayload<GiteaVersion, "commit">;

type MergeBaseBudget = {
  remainingItems: number;
  remainingRequests: number;
  maximumRequests: number;
};

const FIND_MERGE_BASES_LIST_OPERATION = {
  universal: "findMergeBases",
  native: "repoGetAllCommits",
} as const;
const FIND_MERGE_BASES_GET_OPERATION = {
  universal: "findMergeBases",
  native: "repoGetSingleCommit",
} as const;

/** Read exactly one bounded commit page, with every expensive Gitea facet disabled by default. */
export async function listGiteaCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ListCommitsRequest,
  operation: GiteaOperationIdentity = {
    universal: "listCommits",
    native: "repoGetAllCommits",
  },
): Promise<Page<CommitData<"gitea", TVersion>>> {
  const client = await context.client();
  const path = repositoryPath(repository);
  const cursor = decodeGiteaPageCursor(request.cursor, {
    version: context.version,
    operation,
  });
  const limit = cursor.effectiveLimit ?? request.limit;
  const response = await requestGitea(
    context,
    operation,
    () =>
      client.repoGetAllCommits(
        {
          path,
          query: {
            page: cursor.page,
            limit,
            ...facetsQuery(request),
            ...(request.ref === undefined
              ? {}
              : { sha: requireIdentity(request.ref, "commit ref") }),
            ...(request.excluding === undefined
              ? {}
              : { not: requireIdentity(request.excluding, "excluded commit ref") }),
            ...(request.since === undefined ? {} : { since: requiredDate(request.since, "since") }),
            ...(request.until === undefined ? {} : { until: requiredDate(request.until, "until") }),
          },
        },
        requestOptions(request.signal),
      ),
    request.signal,
  );
  const payloads = requireCommitArray(context, operation, response, request);
  return createPage(
    payloads.map((payload) =>
      normalizeGiteaCommit(
        client,
        payload as GiteaEntityPayload<TVersion, "commit">,
        request,
      )
    ),
    giteaPagination(context, operation, response, cursor, limit, payloads.length),
  );
}

/** Fetch one commit directly and request only the explicitly selected facets. */
export async function getGiteaCommit<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  sha: string,
  options: GetCommitOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "getCommit",
    native: "repoGetSingleCommit",
  },
): Promise<CommitData<"gitea", TVersion>> {
  const commitSha = requireIdentity(sha, "commit SHA");
  const client = await context.client();
  const payload = await requestGiteaBody<AnyGiteaCommit, TVersion>(
    context,
    operation,
    () =>
      client.repoGetSingleCommit(
        {
          path: { ...repositoryPath(repository), sha: commitSha },
          query: facetsQuery(options),
        },
        requestOptions(options.signal),
      ),
    options.signal,
    (value): value is AnyGiteaCommit => isCommitPayloadForFacets(value, options),
  );
  return normalizeGiteaCommit(
    client,
    payload as GiteaEntityPayload<TVersion, "commit">,
    options,
  );
}

/** Fetch only the requested unique SHAs with bounded concurrency, then restore input order. */
export async function getGiteaCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  shas: readonly string[],
  options: GetCommitsOptions = {},
): Promise<readonly CommitData<"gitea", TVersion>[]> {
  const operation = { universal: "getCommits", native: "repoGetSingleCommit" } as const;
  const maxItems = requirePositiveInteger(
    options.maxItems ?? DEFAULT_COMMIT_MULTI_GET_MAX_ITEMS,
    "maximum commit items",
  );
  if (shas.length > maxItems) {
    throw validationError(
      context,
      operation,
      `requested ${shas.length} commits, exceeding the ${maxItems} item limit`,
    );
  }
  const validated = shas.map((sha) => requireIdentity(sha, "commit SHA"));
  const unique = [...new Set(validated)];
  const concurrency = boundedConcurrency(options.concurrency);
  const fetched = await mapGiteaBounded(
    context,
    operation,
    unique,
    concurrency,
    options.signal,
    (sha, _index, workerSignal) =>
      getGiteaCommit(context, repository, sha, { ...options, signal: workerSignal }, operation),
  );
  const byInput = new Map(unique.map((sha, index) => [sha, fetched[index]]));
  return Object.freeze(validated.map((sha) => byInput.get(sha)!));
}

/** Compare two refs with one provider request, including Gitea 1.27.2 raw diff/patch output. */
export async function compareGiteaCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  base: string,
  head: string,
  options: CompareCommitsOptions<"gitea", TVersion> = {},
): Promise<CommitComparison<"gitea", TVersion> | GiteaCommitComparisonOutput> {
  const operation = { universal: "compareCommits", native: "repoCompareDiff" } as const;
  const baseRef = requireIdentity(base, "comparison base");
  const headRef = requireIdentity(head, "comparison head");
  const client = await context.client();
  const extension = options.extension as GiteaCompareCommitsExtension | undefined;
  if (extension !== undefined) {
    if (extension.output !== "diff" && extension.output !== "patch") {
      throw validationError(
        context,
        operation,
        "raw comparison output must be diff or patch",
      );
    }
    if (context.version !== "1.27.2") {
      throw validationError(
        context,
        operation,
        "raw diff/patch comparison is available only on Gitea 1.27.2",
      );
    }
    const content = await requestGiteaText(
      context,
      operation,
      () =>
        client.rest.request(
          gitea127Operations.repoCompareDiff,
          {
            path: { ...repositoryPath(repository), basehead: `${baseRef}...${headRef}` },
            query: { output: extension.output },
          },
          { ...requestOptions(options.signal), parseAs: "text" },
        ),
      options.signal,
    );
    return Object.freeze({ output: extension.output, content });
  }
  const payload = await requestGiteaBody<Record<string, unknown>, TVersion>(
    context,
    operation,
    () =>
      client.repoCompareDiff(
        { path: { ...repositoryPath(repository), basehead: `${baseRef}...${headRef}` } },
        requestOptions(options.signal),
      ),
    options.signal,
    isRecord,
  );
  const commits = payload.commits;
  if (!Array.isArray(commits) || !commits.every(isCommitPayload)) {
    throw invariant(context, operation, "comparison returned malformed commits", payload);
  }
  const total = optionalNonNegativeInteger(payload.total_commits);
  if (payload.total_commits !== undefined && total === undefined) {
    throw invariant(
      context,
      operation,
      "comparison returned an invalid total commit count",
      payload,
    );
  }
  return Object.freeze({
    commits: Object.freeze(commits.map((commit) =>
      normalizeGiteaCommit(
        client,
        commit as GiteaEntityPayload<TVersion, "commit">,
      )
    )),
    ...(total === undefined ? {} : { totalCommits: total }),
  });
}

/** Fetch one commit with files enabled and every unrelated expensive facet disabled. */
export async function listGiteaCommitFiles<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  sha: string,
  options: OperationOptions = {},
): Promise<readonly CommitFileData[]> {
  const operation = { universal: "listCommitFiles", native: "repoGetSingleCommit" } as const;
  const commit = await getGiteaCommit(context, repository, sha, {
    signal: options.signal,
    files: true,
    stats: false,
    verification: false,
  }, operation);
  if (commit.files === undefined) {
    throw invariant(context, operation, "commit file data was not returned", commit);
  }
  return commit.files;
}

/**
 * Find maximal common ancestors within explicit item and provider-request budgets.
 *
 * The two exclusive-history scans consume at most `maxItems` commit objects in total. If either
 * side has more history when that ceiling is reached, the operation fails explicitly rather than
 * returning a partial merge-base answer. Every count, scan, hydration, and maximality probe also
 * consumes one unit from `maxRequests` before it starts.
 */
export async function findGiteaMergeBases<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  left: string,
  right: string,
  options: MergeBaseOptions,
): Promise<MergeBasesResult<"gitea", TVersion>> {
  const leftRef = requireIdentity(left, "left ref");
  const rightRef = requireIdentity(right, "right ref");
  const maximum = requirePositiveInteger(options.maxItems, "maximum inspected commits");
  const maximumRequests = requirePositiveInteger(
    options.maxRequests,
    "maximum merge-base requests",
  );
  if (maximumRequests < 2) {
    throw requestBudgetExhausted(context, maximumRequests, 2);
  }
  const budget: MergeBaseBudget = {
    remainingItems: maximum,
    remainingRequests: maximumRequests,
    maximumRequests,
  };
  const [leftCount, rightCount] = await Promise.all([
    countMergeBaseReachable(context, repository, leftRef, rightRef, budget, options),
    countMergeBaseReachable(context, repository, rightRef, leftRef, budget, options),
  ]);
  if (leftCount + rightCount > maximum) {
    throw new IncompleteHistoryError(
      `merge-base history requires inspecting ${
        leftCount + rightCount
      } commits, exceeding the ${maximum} item limit`,
      {
        provider: "gitea",
        version: context.version,
        operation: FIND_MERGE_BASES_LIST_OPERATION.universal,
      },
    );
  }
  const leftExclusive = await scanExclusiveHistory(
    context,
    repository,
    leftRef,
    rightRef,
    budget,
    options.signal,
  );
  const rightExclusive = await scanExclusiveHistory(
    context,
    repository,
    rightRef,
    leftRef,
    budget,
    options.signal,
  );
  const leftSet = new Set(leftExclusive.map((commit) => commit.sha));
  const rightSet = new Set(rightExclusive.map((commit) => commit.sha));
  const candidateRefs = new Set<string>([leftRef, rightRef]);
  for (const commit of leftExclusive) {
    for (const parent of commit.parents) if (!leftSet.has(parent)) candidateRefs.add(parent);
  }
  for (const commit of rightExclusive) {
    for (const parent of commit.parents) if (!rightSet.has(parent)) candidateRefs.add(parent);
  }

  const commonRefs: string[] = [];
  for (const candidate of candidateRefs) {
    if (
      await countMergeBaseReachable(
          context,
          repository,
          candidate,
          leftRef,
          budget,
          options,
        ) === 0 &&
      await countMergeBaseReachable(
          context,
          repository,
          candidate,
          rightRef,
          budget,
          options,
        ) === 0
    ) {
      commonRefs.push(candidate);
    }
  }
  consumeMergeBaseRequests(context, budget, commonRefs.length);
  const resolved = await mapGiteaBounded(
    context,
    FIND_MERGE_BASES_GET_OPERATION,
    commonRefs,
    boundedConcurrency(options.concurrency),
    options.signal,
    (candidate, _index, workerSignal) =>
      getGiteaCommit(
        context,
        repository,
        candidate,
        { ...options, signal: workerSignal },
        FIND_MERGE_BASES_GET_OPERATION,
      ),
  );
  const unique = [...new Map(resolved.map((commit) => [commit.sha, commit])).values()];
  const nonMaximal = new Set<string>();
  for (const candidate of unique) {
    for (const other of unique) {
      if (candidate.sha === other.sha) continue;
      if (
        await countMergeBaseReachable(
          context,
          repository,
          candidate.sha,
          other.sha,
          budget,
          options,
        ) === 0
      ) {
        nonMaximal.add(candidate.sha);
        break;
      }
    }
  }
  return Object.freeze({
    commits: Object.freeze(unique.filter((commit) => !nonMaximal.has(commit.sha))),
    complete: true,
  });
}

/** Count `include --not exclude` from one count-only provider request. */
export async function countGiteaReachableCommits<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  include: string,
  exclude?: string,
  options: OperationOptions = {},
  operation: GiteaOperationIdentity = {
    universal: "countReachableCommits",
    native: "repoGetAllCommits",
  },
): Promise<number> {
  const includeRef = requireIdentity(include, "included commit ref");
  const excludeRef = exclude === undefined
    ? undefined
    : requireIdentity(exclude, "excluded commit ref");
  const response = await requestGitea(
    context,
    operation,
    async () => {
      const client = await context.client();
      return await client.repoGetAllCommits(
        {
          path: repositoryPath(repository),
          query: {
            sha: includeRef,
            ...(excludeRef === undefined ? {} : { not: excludeRef }),
            page: 1,
            limit: 1,
            files: false,
            stat: false,
            verification: false,
          },
        },
        requestOptions(options.signal),
      );
    },
    options.signal,
  );
  requireCommitArray(context, operation, response);
  const raw = response.headers.get("x-total");
  const count = raw === null ? undefined : optionalNonNegativeInteger(raw);
  if (count === undefined) {
    throw invariant(
      context,
      operation,
      "count probe returned a missing or invalid X-Total header",
      response,
    );
  }
  return count;
}

function countMergeBaseReachable<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  include: string,
  exclude: string,
  budget: MergeBaseBudget,
  options: OperationOptions,
): Promise<number> {
  consumeMergeBaseRequests(context, budget, 1);
  return countGiteaReachableCommits(
    context,
    repository,
    include,
    exclude,
    options,
    FIND_MERGE_BASES_LIST_OPERATION,
  );
}

/** Inspect one branch/tag page and optionally test ancestry only for candidates in that page. */
export async function findGiteaRefsForCommit<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
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
  const maxItems = request.maxItems === undefined
    ? request.limit
    : requirePositiveInteger(request.maxItems, "maximum ref items");
  const limit = Math.min(request.limit, maxItems);
  if (request.match === "contains") {
    // The universal fallback bound remains required. Gitea answers each candidate with a
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
    ? await listGiteaBranches(context, repository, pageRequest, branchOperation)
    : await listGiteaTags(context, repository, pageRequest);
  const candidates: readonly CommitRefData[] = page.items.map((item) =>
    Object.freeze({ kind, name: item.name, sha: item.sha })
  );
  const items = request.match === "head"
    ? candidates.filter((candidate) => candidate.sha === commitSha)
    : (await mapGiteaBounded(
      context,
      ancestryOperation,
      candidates,
      boundedConcurrency(request.concurrency),
      request.signal,
      async (candidate, _index, workerSignal) =>
        await countGiteaReachableCommits(
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

/** Aggregate one explicitly bounded commit-history slice by documented Git author identity. */
export async function listGiteaContributors<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  request: ListContributorsRequest,
): Promise<ScanPage<ContributorData>> {
  const operation = { universal: "listContributors", native: "repoGetAllCommits" } as const;
  if (
    request.maxItems === undefined && request.since === undefined && request.until === undefined
  ) {
    throw validationError(
      context,
      operation,
      "contributor aggregation requires maxItems, since, or until as an explicit history boundary",
    );
  }
  const maxItems = request.maxItems === undefined
    ? request.limit
    : requirePositiveInteger(request.maxItems, "maximum contributor history items");
  const ref = request.ref ?? repository.defaultBranch;
  if (ref === undefined) {
    throw validationError(
      context,
      operation,
      "repository has no known default branch; provide an explicit ref",
    );
  }
  const page = await listGiteaCommits(
    context,
    repository,
    {
      limit: Math.min(request.limit, maxItems),
      ...(request.cursor === undefined ? {} : { cursor: request.cursor }),
      ...(request.signal === undefined ? {} : { signal: request.signal }),
      ref: requireIdentity(ref, "contributor history ref"),
      ...(request.since === undefined ? {} : { since: request.since }),
      ...(request.until === undefined ? {} : { until: request.until }),
      files: false,
      stats: false,
      verification: false,
    },
    operation,
  );
  const contributors = new Map<string, { name?: string; email?: string; commits: number }>();
  for (const commit of page.items) {
    const name = commit.author?.name;
    const email = commit.author?.email;
    if (name === undefined && email === undefined) continue;
    const key = email === undefined ? `name:${name}` : `email:${email.toLowerCase()}`;
    const contributor = contributors.get(key);
    if (contributor === undefined) contributors.set(key, { name, email, commits: 1 });
    else contributor.commits++;
  }
  return Object.freeze({
    items: Object.freeze(
      [...contributors.values()].map((contributor) => Object.freeze({ ...contributor })),
    ),
    ...(page.nextCursor === undefined ? {} : { nextCursor: page.nextCursor }),
    complete: page.nextCursor === undefined,
  });
}

/** Normalize one exact generated commit payload while exposing only requested expensive facets. */
export function normalizeGiteaCommit<TVersion extends GiteaVersion>(
  client: GiteaClient<TVersion>,
  commit: GiteaEntityPayload<TVersion, "commit">,
  facets: CommitFacets = {},
): CommitData<"gitea", TVersion> {
  const sha = requiredText(commit.sha, "commit SHA");
  if (!isRecord(commit.commit) || typeof commit.commit.message !== "string") {
    throw new TypeError(`commit ${sha} has no message`);
  }
  const parents = commit.parents === undefined
    ? []
    : commit.parents.map((parent) => requiredText(parent.sha, `commit ${sha} parent SHA`));
  const files = facets.files === true ? normalizeCommitFiles(commit.files, sha) : undefined;
  const stats = facets.stats === true ? normalizeCommitStats(commit.stats, sha) : undefined;
  const verified = facets.verification === true
    ? requiredBoolean(commit.commit.verification?.verified, `commit ${sha} verification`)
    : undefined;
  const url = optionalText(commit.html_url) ?? optionalText(commit.url);
  const author = normalizeActor(commit.commit.author);
  const committer = normalizeActor(commit.commit.committer);
  return Object.freeze({
    sha,
    message: commit.commit.message,
    ...(url === undefined ? {} : { url }),
    ...(author === undefined ? {} : { author }),
    ...(committer === undefined ? {} : { committer }),
    parents: Object.freeze(parents),
    ...(files === undefined ? {} : { files, changedFiles: files.length }),
    ...(stats === undefined ? {} : stats),
    ...(verified === undefined ? {} : { verified }),
    native: createGiteaEntityNative("commit", client, commit),
  });
}

async function scanExclusiveHistory<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  repository: RepositoryData<"gitea", TVersion>,
  include: string,
  exclude: string,
  budget: MergeBaseBudget,
  signal?: AbortSignal,
): Promise<readonly CommitData<"gitea", TVersion>[]> {
  const client = await context.client();
  const commits: CommitData<"gitea", TVersion>[] = [];
  let cursor: string | undefined;
  do {
    if (budget.remainingItems < 1) {
      throw incompleteHistory(context, include, exclude, commits.length);
    }
    const decoded = decodeGiteaPageCursor(cursor, {
      version: context.version,
      operation: FIND_MERGE_BASES_LIST_OPERATION,
    });
    const limit = Math.min(50, budget.remainingItems);
    consumeMergeBaseRequests(context, budget, 1);
    const response = await requestGitea(
      context,
      FIND_MERGE_BASES_LIST_OPERATION,
      () =>
        client.repoGetAllCommits(
          {
            path: repositoryPath(repository),
            query: {
              sha: include,
              not: exclude,
              page: decoded.page,
              limit,
              files: false,
              stat: false,
              verification: false,
            },
          },
          requestOptions(signal),
        ),
      signal,
    );
    const payloads = requireCommitArray(
      context,
      FIND_MERGE_BASES_LIST_OPERATION,
      response,
    );
    if (payloads.length > budget.remainingItems) {
      throw invariant(
        context,
        FIND_MERGE_BASES_LIST_OPERATION,
        "exclusive-history page exceeded its requested inspection budget",
        response,
      );
    }
    commits.push(...payloads.map((payload) =>
      normalizeGiteaCommit(
        client,
        payload as GiteaEntityPayload<TVersion, "commit">,
      )
    ));
    budget.remainingItems -= payloads.length;
    const pagination = giteaPagination(
      context,
      FIND_MERGE_BASES_LIST_OPERATION,
      response,
      decoded,
      limit,
      payloads.length,
    );
    cursor = pagination.nextCursor;
    if (cursor !== undefined && budget.remainingItems === 0) {
      throw incompleteHistory(context, include, exclude, commits.length);
    }
  } while (cursor !== undefined);
  return Object.freeze(commits);
}

function requireCommitArray<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  response: AnyRestResponse,
  facets: CommitFacets = {},
): readonly AnyGiteaCommit[] {
  if (
    Array.isArray(response.body) &&
    response.body.every((value) => isCommitPayloadForFacets(value, facets))
  ) return response.body;
  throw invariant(context, operation, "provider returned malformed commit data", response);
}

function isCommitPayload(value: unknown): value is AnyGiteaCommit {
  if (!isRecord(value) || !hasText(value.sha) || !isRecord(value.commit)) return false;
  if (typeof value.commit.message !== "string") return false;
  return value.parents === undefined ||
    Array.isArray(value.parents) &&
      value.parents.every((parent) => isRecord(parent) && hasText(parent.sha));
}

function isCommitPayloadForFacets(
  value: unknown,
  facets: CommitFacets,
): value is AnyGiteaCommit {
  if (!isCommitPayload(value)) return false;
  if (
    facets.files === true &&
    (!Array.isArray(value.files) ||
      value.files.some((file) =>
        !isRecord(file) || !hasText(file.filename) ||
        file.status !== undefined && typeof file.status !== "string"
      ))
  ) return false;
  if (facets.stats === true && !isCommitStats(value.stats)) return false;
  if (
    facets.verification === true &&
    typeof value.commit?.verification?.verified !== "boolean"
  ) return false;
  return true;
}

function isCommitStats(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  if (value.additions !== undefined && optionalNonNegativeInteger(value.additions) === undefined) {
    return false;
  }
  return value.deletions === undefined || optionalNonNegativeInteger(value.deletions) !== undefined;
}

function facetsQuery(facets: CommitFacets) {
  return {
    files: facets.files === true,
    stat: facets.stats === true,
    verification: facets.verification === true,
  };
}

function normalizeCommitFiles(value: unknown, sha: string): readonly CommitFileData[] {
  if (!Array.isArray(value)) throw new TypeError(`commit ${sha} has no requested file data`);
  return Object.freeze(value.map((file) => {
    if (!isRecord(file)) throw new TypeError(`commit ${sha} has malformed file data`);
    const path = requiredText(file.filename, `commit ${sha} changed file path`);
    return Object.freeze({
      path,
      ...(optionalText(file.status) === undefined ? {} : { status: optionalText(file.status) }),
    });
  }));
}

function normalizeCommitStats(
  value: unknown,
  sha: string,
): { readonly additions?: number; readonly deletions?: number } {
  if (!isRecord(value)) throw new TypeError(`commit ${sha} has no requested statistics`);
  const additions = optionalNonNegativeInteger(value.additions);
  const deletions = optionalNonNegativeInteger(value.deletions);
  if (value.additions !== undefined && additions === undefined) {
    throw new TypeError(`commit ${sha} has invalid additions`);
  }
  if (value.deletions !== undefined && deletions === undefined) {
    throw new TypeError(`commit ${sha} has invalid deletions`);
  }
  return Object.freeze({
    ...(additions === undefined ? {} : { additions }),
    ...(deletions === undefined ? {} : { deletions }),
  });
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

function validateRefKinds<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  values: readonly ("branch" | "tag")[],
  operation: GiteaOperationIdentity,
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

function decodeRefCursor<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  value: string | undefined,
  kinds: readonly ("branch" | "tag")[],
  operation: GiteaOperationIdentity,
): RefCursor {
  if (value === undefined) return Object.freeze({ kindIndex: 0 });
  const match = /^gitea-refs:(branch|tag)(?::(.+))?$/.exec(value);
  if (match === null) {
    throw validationError(context, operation, "invalid Gitea ref cursor");
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
      decodeGiteaPageCursor(providerCursor, {
        version: context.version,
        operation: {
          universal: operation.universal,
          native: kind === "branch" ? "repoListBranches" : "repoListTags",
        },
      });
    } catch (cause) {
      throw validationError(context, operation, "invalid Gitea ref cursor", cause);
    }
  }
  return Object.freeze({ kindIndex, ...(providerCursor === undefined ? {} : { providerCursor }) });
}

function encodeRefCursor(kind: "branch" | "tag", providerCursor?: string): string {
  return `gitea-refs:${kind}${
    providerCursor === undefined ? "" : `:${encodeURIComponent(providerCursor)}`
  }`;
}

function boundedConcurrency(value?: number): number {
  const requested = requirePositiveInteger(value ?? MAX_COMMIT_READ_CONCURRENCY, "concurrency");
  if (requested > MAX_COMMIT_READ_CONCURRENCY) {
    throw new RangeError(`concurrency cannot exceed ${MAX_COMMIT_READ_CONCURRENCY}`);
  }
  return requested;
}

function consumeMergeBaseRequests<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  budget: MergeBaseBudget,
  count: number,
): void {
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new RangeError("merge-base request consumption must be a non-negative safe integer");
  }
  if (budget.remainingRequests < count) {
    throw requestBudgetExhausted(context, budget.maximumRequests, count);
  }
  budget.remainingRequests -= count;
}

function requestBudgetExhausted<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  maximumRequests: number,
  nextRequestCount: number,
): IncompleteHistoryError {
  return new IncompleteHistoryError(
    `merge-base request budget ${maximumRequests} cannot start the next ${nextRequestCount} provider request${
      nextRequestCount === 1 ? "" : "s"
    }`,
    {
      provider: "gitea",
      version: context.version,
      operation: FIND_MERGE_BASES_LIST_OPERATION.universal,
    },
  );
}

function incompleteHistory<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  include: string,
  exclude: string,
  inspected: number,
): IncompleteHistoryError {
  return new IncompleteHistoryError(
    `merge-base history is incomplete after inspecting ${inspected} commits from ${include} excluding ${exclude}`,
    {
      provider: "gitea",
      version: context.version,
      operation: FIND_MERGE_BASES_LIST_OPERATION.universal,
    },
  );
}

function invariant<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  message: string,
  cause?: unknown,
): ProviderInvariantError {
  return new ProviderInvariantError(message, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
    ...(cause === undefined ? {} : { cause }),
  });
}

function validationError<TVersion extends GiteaVersion>(
  context: GiteaAdapterContext<TVersion>,
  operation: GiteaOperationIdentity,
  message: string,
  cause?: unknown,
): ValidationError {
  return new ValidationError(message, {
    provider: "gitea",
    version: context.version,
    operation: operation.universal,
    ...(cause === undefined ? {} : { cause }),
  });
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

function requiredDate(value: string, name: string): string {
  return requireIdentity(value, `${name} date`);
}

function requiredText(value: unknown, name: string): string {
  const text = optionalText(value);
  if (text === undefined || text.trim().length === 0) throw new TypeError(`${name} is missing`);
  return text;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function requiredBoolean(value: unknown, name: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${name} is missing`);
  return value;
}

function optionalNonNegativeInteger(value: unknown): number | undefined {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
    ? Number(value)
    : NaN;
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
