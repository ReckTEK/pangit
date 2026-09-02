import type { Provider, ProviderVersion } from "../../providers/provider.ts";
import type {
  CreateRepositoryOptions,
  RepositoryContainerData,
  RepositoryContainerKind,
  RepositoryProviderAdapter,
} from "../provider-adapters/RepositoryProviderAdapter.ts";
import type { GiteaRepositoryContainerNative } from "../provider-adapters/gitea/GiteaRepositoryContainerNative.ts";
import { createRepository, type Repository } from "../repositories/Repository.ts";

type GiteaVersion = ProviderVersion<"gitea">;

/** Native provider door narrowed by the provider selected when the client was created. */
export type RepositoryContainerNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = TProvider extends "gitea" ? GiteaRepositoryContainerNative<TVersion & GiteaVersion>
  : Record<never, never>;

/** A fetched repository-owning container such as a user, organization, group, or workspace. */
export interface RepositoryContainer<
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
  /** Selected-provider escape hatch with exact generated types. */
  readonly native: RepositoryContainerNative<TProvider, TVersion>;

  /** List repositories owned by this container. */
  repositories(): Promise<readonly Repository<TProvider, TVersion>[]>;

  /** Fetch one repository owned by this container. */
  repository(name: string): Promise<Repository<TProvider, TVersion>>;

  /** Fetch one repository when it exists, otherwise return undefined. */
  findRepository(name: string): Promise<Repository<TProvider, TVersion> | undefined>;

  /** Check for one repository without listing every repository in this container. */
  hasRepository(name: string): Promise<boolean>;

  /** Create one repository owned by this container. */
  createRepository(
    name: string,
    options?: CreateRepositoryOptions,
  ): Promise<Repository<TProvider, TVersion>>;
}

/** Immutable repository-owning container backed by the selected provider adapter. */
class RepositoryContainerImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements RepositoryContainer<TProvider, TVersion> {
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
  /** Selected-provider escape hatch with exact generated types. */
  readonly native: RepositoryContainerNative<TProvider, TVersion>;
  /** Adapter that owns every native container operation. */
  readonly #provider: RepositoryProviderAdapter<TProvider, TVersion>;
  /** Normalized and native container state retained by this entity. */
  readonly #data: RepositoryContainerData<TProvider, TVersion>;

  /** Bind fetched container data to its selected provider implementation. */
  constructor(
    provider: RepositoryProviderAdapter<TProvider, TVersion>,
    data: RepositoryContainerData<TProvider, TVersion>,
  ) {
    this.#provider = provider;
    this.#data = data;
    this.kind = this.#data.kind;
    this.id = this.#data.id;
    this.name = this.#data.name;
    this.displayName = this.#data.displayName;
    this.description = this.#data.description;
    this.native = this.#data.native;
    Object.freeze(this);
  }

  /** List repositories owned by this container. */
  async repositories(): Promise<readonly Repository<TProvider, TVersion>[]> {
    return (await this.#provider.containerRepositories(this.#data)).map((repository) =>
      createRepository(this.#provider, repository)
    );
  }

  /** Fetch one repository owned by this container. */
  async repository(name: string): Promise<Repository<TProvider, TVersion>> {
    requireIdentity(name, "repository name");
    return createRepository(
      this.#provider,
      await this.#provider.containerRepository(this.#data, name),
    );
  }

  /** Fetch one repository when it exists, otherwise return undefined. */
  async findRepository(name: string): Promise<Repository<TProvider, TVersion> | undefined> {
    requireIdentity(name, "repository name");
    const repository = await this.#provider.findContainerRepository(this.#data, name);
    return repository === undefined ? undefined : createRepository(this.#provider, repository);
  }

  /** Check for one repository without listing every repository in this container. */
  async hasRepository(name: string): Promise<boolean> {
    requireIdentity(name, "repository name");
    return await this.#provider.findContainerRepository(this.#data, name) !== undefined;
  }

  /** Create one repository owned by this container. */
  async createRepository(
    name: string,
    options: CreateRepositoryOptions = {},
  ): Promise<Repository<TProvider, TVersion>> {
    requireIdentity(name, "repository name");
    return createRepository(
      this.#provider,
      await this.#provider.createContainerRepository(this.#data, name, options),
    );
  }
}

/** Build one immutable repository container from provider-normalized data. */
export function createRepositoryContainer<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: RepositoryProviderAdapter<TProvider, TVersion>,
  data: RepositoryContainerData<TProvider, TVersion>,
): RepositoryContainer<TProvider, TVersion> {
  return new RepositoryContainerImpl(provider, data);
}

/** Reject an empty direct identity before calling the selected provider. */
function requireIdentity(value: string, name: string): void {
  if (value.length === 0) throw new TypeError(`${name} cannot be empty`);
}
