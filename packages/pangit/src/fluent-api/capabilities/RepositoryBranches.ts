import type { FluentProvider, ProviderVersion } from "../adapter-contract/provider.ts";
import type {
  BranchDivergence,
  CreateBranchInput,
  ListBranchDivergencesRequest,
} from "../adapter-contract/branches.ts";
import type { ValidationErrorContext } from "../adapter-contract/errors.ts";
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
} from "../adapter-contract/pagination.ts";

import type { RepositoryData } from "../adapter-contract/repositories.ts";

import { type Branch, createBranch } from "../entities/Branch.ts";

export interface ListBranchesOptions extends PageRequest {
  readonly query?: string;
}

export interface ListBranchDivergencesOptions extends ListBranchesOptions {
  readonly base: string;
  readonly maxItems?: number;
  readonly concurrency?: number;
}

export interface BranchDivergenceResult<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly branch: Branch<TProvider, TVersion>;
  readonly divergence: BranchDivergence;
}

export interface RepositoryBranches<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  list(options?: ListBranchesOptions): Promise<Page<Branch<TProvider, TVersion>>>;
  get(name: string, options?: OperationOptions): Promise<Branch<TProvider, TVersion>>;
  exists(name: string, options?: OperationOptions): Promise<boolean>;
  create(
    input: CreateBranchInput,
    options?: OperationOptions,
  ): Promise<Branch<TProvider, TVersion>>;
  rename(
    branch: Branch<TProvider, TVersion>,
    name: string,
    options?: OperationOptions,
  ): Promise<void>;
  delete(branch: Branch<TProvider, TVersion>, options?: OperationOptions): Promise<void>;
  divergence(base: string, head: string, options?: OperationOptions): Promise<BranchDivergence>;
  listDivergences(
    options: ListBranchDivergencesOptions,
  ): Promise<Page<BranchDivergenceResult<TProvider, TVersion>>>;
}

export function createRepositoryBranches<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: GitHostAdapter<TProvider, TVersion>,
  repository: RepositoryData<TProvider, TVersion>,
): RepositoryBranches<TProvider, TVersion> {
  return Object.freeze({
    async list(options: ListBranchesOptions = {}) {
      const context = validationContext(adapter, "listBranches");
      const page = await adapter.listBranches(repository, {
        ...resolvePageRequest(options, 50, context),
        ...(options.query === undefined
          ? {}
          : { query: requireIdentity(options.query, "branch query", context) }),
      });
      return createPage(page.items.map(createBranch), page);
    },
    async get(name: string, options: OperationOptions = {}) {
      const context = validationContext(adapter, "getBranch");
      return createBranch(
        await adapter.getBranch(
          repository,
          requireIdentity(name, "branch name", context),
          options,
        ),
      );
    },
    exists(name: string, options: OperationOptions = {}) {
      return adapter.branchExists(
        repository,
        requireIdentity(name, "branch name", validationContext(adapter, "branchExists")),
        options,
      );
    },
    async create(input: CreateBranchInput, options: OperationOptions = {}) {
      const context = validationContext(adapter, "createBranch");
      requireIdentity(input.name, "branch name", context);
      requireIdentity(input.source, "branch source", context);
      return createBranch(await adapter.createBranch(repository, input, options));
    },
    rename(
      branch: Branch<TProvider, TVersion>,
      name: string,
      options: OperationOptions = {},
    ) {
      const context = validationContext(adapter, "renameBranch");
      return adapter.renameBranch(
        repository,
        branchData(branch, context),
        requireIdentity(name, "branch name", context),
        options,
      );
    },
    delete(branch: Branch<TProvider, TVersion>, options: OperationOptions = {}) {
      const context = validationContext(adapter, "deleteBranch");
      return adapter.deleteBranch(repository, branchData(branch, context), options);
    },
    divergence(base: string, head: string, options: OperationOptions = {}) {
      const context = validationContext(adapter, "getDivergence");
      return adapter.getDivergence(
        repository,
        requireIdentity(base, "base ref", context),
        requireIdentity(head, "head ref", context),
        options,
      );
    },
    async listDivergences(options: ListBranchDivergencesOptions) {
      const context = validationContext(adapter, "listBranchDivergences");
      const base = requireIdentity(options.base, "base ref", context);
      const request: ListBranchDivergencesRequest = {
        ...resolvePageRequest(options, 50, context),
        base,
        ...(options.query === undefined
          ? {}
          : { query: requireIdentity(options.query, "branch query", context) }),
        ...(options.maxItems === undefined ? {} : {
          maxItems: requirePositiveInteger(
            options.maxItems,
            "maximum branch items",
            context,
          ),
        }),
        ...(options.concurrency === undefined ? {} : {
          concurrency: requirePositiveInteger(
            options.concurrency,
            "branch concurrency",
            context,
          ),
        }),
      };
      const page = await adapter.listBranchDivergences(repository, request);
      return createPage(
        page.items.map((item) =>
          Object.freeze({ branch: createBranch(item.branch), divergence: item.divergence })
        ),
        page,
      );
    },
  });
}

function branchData<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  branch: Branch<TProvider, TVersion>,
  context: ValidationErrorContext<TProvider, TVersion>,
) {
  return {
    name: requireIdentity(branch.name, "branch name", context),
    sha: requireIdentity(branch.sha, "branch SHA", context),
    ...(branch.protected === undefined ? {} : { protected: branch.protected }),
    native: branch.native,
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
