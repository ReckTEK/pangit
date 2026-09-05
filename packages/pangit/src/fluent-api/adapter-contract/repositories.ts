import type { Provider, ProviderTypeRegistry, ProviderVersion } from "./provider.ts";

import type {
  ProviderRepositoryContainerNative,
  ProviderRepositoryNative,
} from "../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest } from "./pagination.ts";

/** Repository-owning container kinds used across supported provider vocabularies. */
export type RepositoryContainerKind =
  | "user"
  | "organization"
  | "group"
  | "workspace"
  | "project";

/** One caller-supplied file included while initializing a repository. */
export interface InitialRepositoryFile {
  readonly path: string;
  readonly content: string | Uint8Array;
  /** Initial repository inputs always create a path; no existing file is silently overwritten. */
  readonly mode?: "create";
}

/** Portable repository creation options shared by provider adapters. */
export interface CreateRepositoryOptions extends OperationOptions {
  readonly description?: string;
  readonly private?: boolean;
  /** Create a real initial branch and commit. Implied when `files` is nonempty. */
  readonly initialize?: boolean;
  readonly defaultBranch?: string;
  readonly initialCommitMessage?: string;
  readonly files?: readonly InitialRepositoryFile[];
}

/** Provider-neutral identity for a fork parent. */
export interface RepositoryParentData<
  TProvider extends Provider = Provider,
> {
  readonly provider: TProvider;
  readonly id?: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
}

/** Provider-normalized repository-owning container data. */
export interface RepositoryContainerData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly kind: RepositoryContainerKind;
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly native: ProviderRepositoryContainerNative<TProvider, TVersion, TRegistry>;
}

/** Provider-normalized repository data. */
export interface RepositoryData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly description?: string;
  readonly defaultBranch?: string;
  readonly private?: boolean;
  readonly url?: string;
  readonly parent?: RepositoryParentData<TProvider>;
  readonly native: ProviderRepositoryNative<TProvider, TVersion, TRegistry>;
}

/** Repository-container discovery and repository lifecycle adapter operations. */
export interface RepositoryAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  listRepositoryContainers(
    request: ResolvedPageRequest,
  ): Promise<Page<RepositoryContainerData<TProvider, TVersion, TRegistry>>>;
  getRepositoryContainer(
    name: string,
    options?: OperationOptions,
  ): Promise<RepositoryContainerData<TProvider, TVersion, TRegistry>>;
  listRepositories(
    container: RepositoryContainerData<TProvider, TVersion, TRegistry>,
    request: ResolvedPageRequest,
  ): Promise<Page<RepositoryData<TProvider, TVersion, TRegistry>>>;
  getRepository(
    container: RepositoryContainerData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<RepositoryData<TProvider, TVersion, TRegistry>>;
  findRepository(
    container: RepositoryContainerData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<RepositoryData<TProvider, TVersion, TRegistry> | undefined>;
  hasRepository(
    container: RepositoryContainerData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<boolean>;
  createRepository(
    container: RepositoryContainerData<TProvider, TVersion, TRegistry>,
    name: string,
    options: CreateRepositoryOptions,
  ): Promise<RepositoryData<TProvider, TVersion, TRegistry>>;
  renameRepository(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<RepositoryData<TProvider, TVersion, TRegistry>>;
  deleteRepository(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<void>;
}
