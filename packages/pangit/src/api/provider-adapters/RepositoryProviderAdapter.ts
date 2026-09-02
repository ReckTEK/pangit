import type { Provider, ProviderVersion } from "../../providers/provider.ts";
import type { RepositoryContainerNative } from "../containers/RepositoryContainer.ts";
import type { RepositoryNative } from "../repositories/Repository.ts";

/** Repository-owning container kinds used across supported provider vocabularies. */
export type RepositoryContainerKind =
  | "user"
  | "organization"
  | "group"
  | "workspace"
  | "project";

/** Portable options shared by provider implementations when creating a repository. */
export interface CreateRepositoryOptions {
  /** Human-readable repository description. */
  readonly description?: string;
  /** Whether the repository is private. */
  readonly private?: boolean;
  /** Whether the provider should create the initial commit. */
  readonly initialize?: boolean;
  /** Initial default branch name when the repository is initialized. */
  readonly defaultBranch?: string;
}

/** Provider-normalized data retained by a fluent repository-owning container. */
export interface RepositoryContainerData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  /** Provider-neutral description of the native repository-owning scope. */
  readonly kind: RepositoryContainerKind;
  /** Stable provider identity represented as text. */
  readonly id: string;
  /** Provider lookup name. */
  readonly name: string;
  /** Human-facing name when it differs from the lookup name. */
  readonly displayName?: string;
  /** Human-facing container description. */
  readonly description?: string;
  /** Selected-provider access to the exact generated payload and client. */
  readonly native: RepositoryContainerNative<TProvider, TVersion>;
}

/** Provider-normalized repository data retained by a fluent repository entity. */
export interface RepositoryData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  /** Stable provider identity represented as text. */
  readonly id: string;
  /** Repository owner lookup name. */
  readonly owner: string;
  /** Repository lookup name. */
  readonly name: string;
  /** Provider-qualified repository name. */
  readonly fullName: string;
  /** Human-facing repository description. */
  readonly description?: string;
  /** Default branch reported by the provider. */
  readonly defaultBranch?: string;
  /** Whether the repository is private. */
  readonly private?: boolean;
  /** Browser URL reported by the provider. */
  readonly url?: string;
  /** Selected-provider access to the exact generated payload and client. */
  readonly native: RepositoryNative<TProvider, TVersion>;
}

/** One provider's complete implementation of the repository-container contract. */
export interface RepositoryProviderAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  /** Create and verify a new adapter carrying token credentials. */
  authorizeToken(
    token: string,
    tokenType?: string,
    signal?: AbortSignal,
  ): Promise<RepositoryProviderAdapter<TProvider, TVersion>>;

  /** List repository-owning containers discoverable with the current credentials. */
  containers(): Promise<readonly RepositoryContainerData<TProvider, TVersion>[]>;

  /** Resolve one repository-owning container by its provider lookup name. */
  container(name: string): Promise<RepositoryContainerData<TProvider, TVersion>>;

  /** List repositories owned by one fetched container. */
  containerRepositories(
    container: RepositoryContainerData<TProvider, TVersion>,
  ): Promise<readonly RepositoryData<TProvider, TVersion>[]>;

  /** Fetch one repository owned by one fetched container. */
  containerRepository(
    container: RepositoryContainerData<TProvider, TVersion>,
    name: string,
  ): Promise<RepositoryData<TProvider, TVersion>>;

  /** Fetch one repository when present without treating a confirmed absence as an error. */
  findContainerRepository(
    container: RepositoryContainerData<TProvider, TVersion>,
    name: string,
  ): Promise<RepositoryData<TProvider, TVersion> | undefined>;

  /** Create one repository owned by one fetched container. */
  createContainerRepository(
    container: RepositoryContainerData<TProvider, TVersion>,
    name: string,
    options: CreateRepositoryOptions,
  ): Promise<RepositoryData<TProvider, TVersion>>;

  /** Rename one fetched repository and return its refreshed entity data. */
  renameRepository(
    repository: RepositoryData<TProvider, TVersion>,
    name: string,
  ): Promise<RepositoryData<TProvider, TVersion>>;

  /** Permanently delete one fetched repository. */
  deleteRepository(repository: RepositoryData<TProvider, TVersion>): Promise<void>;
}

/** Lazily return the adapter selected once for a fluent client. */
export type SelectedRepositoryProviderAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = () => Promise<RepositoryProviderAdapter<TProvider, TVersion>>;
