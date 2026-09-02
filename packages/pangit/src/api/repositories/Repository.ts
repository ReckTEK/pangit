import type { Provider, ProviderVersion } from "../../providers/provider.ts";
import type {
  RepositoryData,
  RepositoryProviderAdapter,
} from "../provider-adapters/RepositoryProviderAdapter.ts";
import type { GiteaRepositoryNative } from "../provider-adapters/gitea/GiteaRepositoryNative.ts";

type GiteaVersion = ProviderVersion<"gitea">;

/** Native provider door narrowed by the provider selected when the client was created. */
export type RepositoryNative<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> = TProvider extends "gitea" ? GiteaRepositoryNative<TVersion & GiteaVersion>
  : Record<never, never>;

/** A fetched repository with portable repository lifecycle operations. */
export interface Repository<
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
  /** Selected-provider escape hatch with exact generated types. */
  readonly native: RepositoryNative<TProvider, TVersion>;

  /** Rename this repository and return the refreshed entity. */
  rename(name: string): Promise<Repository<TProvider, TVersion>>;

  /** Permanently delete this repository. */
  delete(): Promise<void>;
}

/** Immutable repository entity backed by the selected provider adapter. */
class RepositoryImpl<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> implements Repository<TProvider, TVersion> {
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
  /** Selected-provider escape hatch with exact generated types. */
  readonly native: RepositoryNative<TProvider, TVersion>;
  /** Adapter that owns every native repository operation. */
  readonly #provider: RepositoryProviderAdapter<TProvider, TVersion>;
  /** Normalized and native repository state retained by this entity. */
  readonly #data: RepositoryData<TProvider, TVersion>;

  /** Bind fetched repository data to its selected provider implementation. */
  constructor(
    provider: RepositoryProviderAdapter<TProvider, TVersion>,
    data: RepositoryData<TProvider, TVersion>,
  ) {
    this.#provider = provider;
    this.#data = data;
    this.id = this.#data.id;
    this.owner = this.#data.owner;
    this.name = this.#data.name;
    this.fullName = this.#data.fullName;
    this.description = this.#data.description;
    this.defaultBranch = this.#data.defaultBranch;
    this.private = this.#data.private;
    this.url = this.#data.url;
    this.native = this.#data.native;
    Object.freeze(this);
  }

  /** Rename this repository and return the refreshed entity. */
  async rename(name: string): Promise<Repository<TProvider, TVersion>> {
    if (name.length === 0) throw new TypeError("repository name cannot be empty");
    return createRepository(
      this.#provider,
      await this.#provider.renameRepository(this.#data, name),
    );
  }

  /** Permanently delete this repository. */
  delete(): Promise<void> {
    return this.#provider.deleteRepository(this.#data);
  }
}

/** Build one immutable repository entity from provider-normalized data. */
export function createRepository<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
>(
  provider: RepositoryProviderAdapter<TProvider, TVersion>,
  data: RepositoryData<TProvider, TVersion>,
): Repository<TProvider, TVersion> {
  return new RepositoryImpl(provider, data);
}
