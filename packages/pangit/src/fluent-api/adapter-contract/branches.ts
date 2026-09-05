import type { Provider, ProviderTypeRegistry, ProviderVersion } from "./provider.ts";

import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { BoundedOperationOptions, OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest } from "./pagination.ts";
import type { RepositoryData } from "./repositories.ts";

export interface BranchData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly name: string;
  readonly sha: string;
  readonly protected?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "branch", TRegistry>;
}

export interface ListBranchesRequest extends ResolvedPageRequest {
  readonly query?: string;
}

export interface CreateBranchInput {
  readonly name: string;
  readonly source: string;
}

export interface BranchDivergence {
  readonly ahead: number;
  readonly behind: number;
  readonly complete: true;
}

export interface BranchDivergenceData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly branch: BranchData<TProvider, TVersion, TRegistry>;
  readonly divergence: BranchDivergence;
}

export interface ListBranchDivergencesRequest extends ListBranchesRequest, BoundedOperationOptions {
  readonly base: string;
}

export interface BranchAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  listBranches(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    request: ListBranchesRequest,
  ): Promise<Page<BranchData<TProvider, TVersion, TRegistry>>>;
  getBranch(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<BranchData<TProvider, TVersion, TRegistry>>;
  branchExists(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<boolean>;
  createBranch(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    input: CreateBranchInput,
    options?: OperationOptions,
  ): Promise<BranchData<TProvider, TVersion, TRegistry>>;
  renameBranch(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    branch: BranchData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<void>;
  deleteBranch(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    branch: BranchData<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<void>;
  getDivergence(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    base: string,
    head: string,
    options?: OperationOptions,
  ): Promise<BranchDivergence>;
  listBranchDivergences(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    request: ListBranchDivergencesRequest,
  ): Promise<Page<BranchDivergenceData<TProvider, TVersion, TRegistry>>>;
}
