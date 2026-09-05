import type { FluentProvider, ProviderVersion } from "../adapter-contract/provider.ts";
import {
  type CommitComparison,
  type CommitFileData,
  type CommitRefData,
  type CompareCommitsOptions,
  type ContributorData,
  DEFAULT_COMMIT_MULTI_GET_MAX_ITEMS,
  type FindCommitRefsRequest,
  type GetCommitOptions,
  type GetCommitsOptions,
  type ListCommitsRequest,
  type ListContributorsRequest,
  MAX_COMMIT_READ_CONCURRENCY,
  type MergeBaseOptions,
  type MergeBasesResult,
} from "../adapter-contract/commits.ts";

import { ValidationError, type ValidationErrorContext } from "../adapter-contract/errors.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import {
  type OperationOptions,
  requireIdentity,
  requirePositiveInteger,
} from "../adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
  type ScanPage,
} from "../adapter-contract/pagination.ts";

import type { RepositoryData } from "../adapter-contract/repositories.ts";
import { type Commit, createCommit } from "../entities/Commit.ts";

import {
  createOperationExtension,
  type OperationExtension,
} from "../provider-extensions/OperationExtension.ts";

export interface ListCommitsOptions
  extends PageRequest, Omit<ListCommitsRequest, "limit" | "cursor" | "signal"> {}
export interface FindCommitRefsOptions
  extends PageRequest, Omit<FindCommitRefsRequest, "limit" | "cursor" | "signal"> {}
export interface ListContributorsOptions
  extends PageRequest, Omit<ListContributorsRequest, "limit" | "cursor" | "signal"> {}

export interface CommitComparisonResult<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> extends Omit<CommitComparison<TProvider, TVersion>, "commits"> {
  readonly commits: readonly Commit<TProvider, TVersion>[];
}

export interface MergeBases<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> extends Omit<MergeBasesResult<TProvider, TVersion>, "commits"> {
  readonly commits: readonly Commit<TProvider, TVersion>[];
}

export type CompareCommitsOperation<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> = OperationExtension<
  "commits.compare",
  TProvider,
  TVersion,
  CommitComparisonResult<TProvider, TVersion>
>;

export interface RepositoryCommits<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  list(options?: ListCommitsOptions): Promise<Page<Commit<TProvider, TVersion>>>;
  get(sha: string, options?: GetCommitOptions): Promise<Commit<TProvider, TVersion>>;
  getMany(
    shas: readonly string[],
    options?: GetCommitsOptions,
  ): Promise<readonly Commit<TProvider, TVersion>[]>;
  compare(
    base: string,
    head: string,
  ): CompareCommitsOperation<TProvider, TVersion>;
  files(sha: string, options?: OperationOptions): Promise<readonly Readonly<CommitFileData>[]>;
  mergeBases(
    left: string,
    right: string,
    options: MergeBaseOptions,
  ): Promise<MergeBases<TProvider, TVersion>>;
  countReachable(include: string, exclude?: string, options?: OperationOptions): Promise<number>;
  findRefs(sha: string, options: FindCommitRefsOptions): Promise<Page<CommitRefData>>;
  contributors(options: ListContributorsOptions): Promise<ScanPage<ContributorData>>;
}

export function createRepositoryCommits<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: GitHostAdapter<TProvider, TVersion>,
  repository: RepositoryData<TProvider, TVersion>,
): RepositoryCommits<TProvider, TVersion> {
  return Object.freeze({
    async list(options: ListCommitsOptions = {}) {
      const context = validationContext(adapter, "listCommits");
      const page = await adapter.listCommits(repository, {
        ...resolvePageRequest(options, 50, context),
        ...commitListOptions(options, context),
      });
      return createPage(page.items.map(createCommit), page);
    },
    async get(sha: string, options: GetCommitOptions = {}) {
      return createCommit(
        await adapter.getCommit(
          repository,
          requireIdentity(sha, "commit SHA", validationContext(adapter, "getCommit")),
          options,
        ),
      );
    },
    async getMany(shas: readonly string[], options: GetCommitsOptions = {}) {
      const context = validationContext(adapter, "getCommits");
      const maxItems = requirePositiveInteger(
        options.maxItems ?? DEFAULT_COMMIT_MULTI_GET_MAX_ITEMS,
        "maximum commit items",
        context,
      );
      if (shas.length > maxItems) {
        throw new ValidationError(
          `requested ${shas.length} commits, exceeding the ${maxItems} item limit`,
          context,
        );
      }
      validateConcurrency(options.concurrency, context);
      const validated = shas.map((sha) => requireIdentity(sha, "commit SHA", context));
      return Object.freeze(
        (await adapter.getCommits(repository, validated, options)).map(createCommit),
      );
    },
    compare(base: string, head: string) {
      const context = validationContext(adapter, "compareCommits");
      const baseRef = requireIdentity(base, "base ref", context);
      const headRef = requireIdentity(head, "head ref", context);
      return createOperationExtension<
        "commits.compare",
        TProvider,
        TVersion,
        CommitComparisonResult<TProvider, TVersion>
      >({
        operation: "commits.compare",
        support: adapter.extensions["commits.compare"],
        validationContext: context,
        provider: adapter.provider,
        version: adapter.version,
        context: Object.freeze({
          repositoryFullName: repository.fullName,
          base: baseRef,
          head: headRef,
        }),
        execute: async (extension, options) => {
          const comparison = await adapter.compareCommits(repository, baseRef, headRef, {
            ...options,
            ...(extension === undefined ? {} : { extension }),
          } as CompareCommitsOptions<TProvider, TVersion>);
          if (!("commits" in comparison)) {
            return comparison;
          }
          return Object.freeze({
            commits: Object.freeze(comparison.commits.map(createCommit)),
            ...(comparison.totalCommits === undefined
              ? {}
              : { totalCommits: comparison.totalCommits }),
          });
        },
      });
    },
    async files(sha: string, options: OperationOptions = {}) {
      const context = validationContext(adapter, "listCommitFiles");
      return Object.freeze(
        (await adapter.listCommitFiles(
          repository,
          requireIdentity(sha, "commit SHA", context),
          options,
        ))
          .map((file) => Object.freeze({ ...file })),
      );
    },
    async mergeBases(
      left: string,
      right: string,
      options: MergeBaseOptions,
    ) {
      const context = validationContext(adapter, "findMergeBases");
      requirePositiveInteger(options.maxItems, "maximum inspected commits", context);
      requirePositiveInteger(options.maxRequests, "maximum merge-base requests", context);
      validateConcurrency(options.concurrency, context);
      const result = await adapter.findMergeBases(
        repository,
        requireIdentity(left, "left ref", context),
        requireIdentity(right, "right ref", context),
        options,
      );
      return Object.freeze({
        commits: Object.freeze(result.commits.map(createCommit)),
        complete: true as const,
      });
    },
    countReachable(
      include: string,
      exclude?: string,
      options: OperationOptions = {},
    ) {
      const context = validationContext(adapter, "countReachableCommits");
      return adapter.countReachableCommits(
        repository,
        requireIdentity(include, "include ref", context),
        exclude === undefined ? undefined : requireIdentity(exclude, "exclude ref", context),
        options,
      );
    },
    findRefs(sha: string, options: FindCommitRefsOptions) {
      const context = validationContext(adapter, "findRefsForCommit");
      validateRefKinds(options.kinds, context);
      if (options.match !== "head" && options.match !== "contains") {
        throw new ValidationError("commit ref match must be head or contains", context);
      }
      if (options.maxItems !== undefined) {
        requirePositiveInteger(options.maxItems, "maximum ref items", context);
      }
      validateConcurrency(options.concurrency, context);
      if (options.match === "contains") {
        requirePositiveInteger(
          options.maxCommitsPerRef ?? 0,
          "maximum commits per candidate ref",
          context,
        );
      } else if (options.maxCommitsPerRef !== undefined) {
        requirePositiveInteger(
          options.maxCommitsPerRef,
          "maximum commits per candidate ref",
          context,
        );
      }
      return adapter.findRefsForCommit(repository, requireIdentity(sha, "commit SHA", context), {
        ...resolvePageRequest(options, 50, context),
        kinds: options.kinds,
        match: options.match,
        ...(options.maxItems === undefined ? {} : { maxItems: options.maxItems }),
        ...(options.concurrency === undefined ? {} : { concurrency: options.concurrency }),
        ...(options.maxCommitsPerRef === undefined
          ? {}
          : { maxCommitsPerRef: options.maxCommitsPerRef }),
      });
    },
    contributors(options: ListContributorsOptions) {
      const context = validationContext(adapter, "listContributors");
      if (
        options.maxItems === undefined && options.since === undefined && options.until === undefined
      ) {
        throw new ValidationError(
          "contributor aggregation requires maxItems, since, or until as an explicit history boundary",
          context,
        );
      }
      if (options.maxItems !== undefined) {
        requirePositiveInteger(options.maxItems, "maximum contributor history items", context);
      }
      validateConcurrency(options.concurrency, context);
      return adapter.listContributors(repository, {
        ...resolvePageRequest(options, 50, context),
        ...(options.maxItems === undefined ? {} : { maxItems: options.maxItems }),
        ...(options.concurrency === undefined ? {} : { concurrency: options.concurrency }),
        ...(options.ref === undefined
          ? {}
          : { ref: requireIdentity(options.ref, "contributor history ref", context) }),
        ...(options.since === undefined
          ? {}
          : { since: requireIdentity(options.since, "since date", context) }),
        ...(options.until === undefined
          ? {}
          : { until: requireIdentity(options.until, "until date", context) }),
      });
    },
  });
}

function commitListOptions(
  options: ListCommitsOptions,
  context: ValidationErrorContext,
): Omit<ListCommitsRequest, "limit" | "cursor" | "signal"> {
  return {
    ...(options.ref === undefined
      ? {}
      : { ref: requireIdentity(options.ref, "commit ref", context) }),
    ...(options.since === undefined
      ? {}
      : { since: requireIdentity(options.since, "since date", context) }),
    ...(options.until === undefined
      ? {}
      : { until: requireIdentity(options.until, "until date", context) }),
    ...(options.excluding === undefined
      ? {}
      : { excluding: requireIdentity(options.excluding, "excluded commit ref", context) }),
    ...(options.files === undefined ? {} : { files: options.files }),
    ...(options.stats === undefined ? {} : { stats: options.stats }),
    ...(options.verification === undefined ? {} : { verification: options.verification }),
  };
}

function validationContext<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: GitHostAdapter<TProvider, TVersion>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  return { provider: adapter.provider, version: adapter.version, operation };
}

function validateConcurrency(
  value: number | undefined,
  context: ValidationErrorContext,
): void {
  if (value === undefined) return;
  requirePositiveInteger(value, "concurrency", context);
  if (value > MAX_COMMIT_READ_CONCURRENCY) {
    throw new ValidationError(
      `concurrency cannot exceed ${MAX_COMMIT_READ_CONCURRENCY}`,
      context,
    );
  }
}

function validateRefKinds(
  values: readonly ("branch" | "tag")[],
  context: ValidationErrorContext,
): void {
  if (values.length === 0) {
    throw new ValidationError("at least one ref kind is required", context);
  }
  if (new Set(values).size !== values.length) {
    throw new ValidationError("ref kinds must not contain duplicates", context);
  }
}
