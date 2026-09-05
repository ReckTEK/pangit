import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import { type OperationOptions, requireIdentity } from "../adapter-contract/operation-options.ts";
import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../adapter-contract/pagination.ts";

import type {
  CreateRepositoryOptions,
  RepositoryContainerData,
  RepositoryContainerKind,
} from "../adapter-contract/repositories.ts";

import type { ProviderRepositoryContainerNative } from "../native-access/ProviderNativeRegistry.ts";

import { createRepository, type Repository } from "./Repository.ts";

/** A fetched repository-owning user or organization. */
export interface RepositoryContainer<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly kind: RepositoryContainerKind;
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly native: ProviderRepositoryContainerNative<TProvider, TVersion, TRegistry>;

  /** Fetch one bounded provider page; this never drains the complete collection. */
  repositories(request?: PageRequest): Promise<Page<Repository<TProvider, TVersion, TRegistry>>>;
  repository(
    name: string,
    options?: OperationOptions,
  ): Promise<Repository<TProvider, TVersion, TRegistry>>;
  findRepository(
    name: string,
    options?: OperationOptions,
  ): Promise<Repository<TProvider, TVersion, TRegistry> | undefined>;
  hasRepository(name: string, options?: OperationOptions): Promise<boolean>;
  createRepository(
    name: string,
    options?: CreateRepositoryOptions,
  ): Promise<Repository<TProvider, TVersion, TRegistry>>;
}

class RepositoryContainerImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> implements RepositoryContainer<TProvider, TVersion, TRegistry> {
  readonly #adapter: GitHostAdapter<TProvider, TVersion, TRegistry>;
  readonly #data: RepositoryContainerData<TProvider, TVersion, TRegistry>;
  readonly kind: RepositoryContainerKind;
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly native: ProviderRepositoryContainerNative<TProvider, TVersion, TRegistry>;

  constructor(
    adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
    data: RepositoryContainerData<TProvider, TVersion, TRegistry>,
  ) {
    this.#adapter = adapter;
    this.#data = data;
    this.kind = data.kind;
    this.id = data.id;
    this.name = data.name;
    this.displayName = data.displayName;
    this.description = data.description;
    this.native = data.native;
    Object.freeze(this);
  }

  async repositories(
    request: PageRequest = {},
  ): Promise<Page<Repository<TProvider, TVersion, TRegistry>>> {
    const page = await this.#adapter.listRepositories(
      this.#data,
      resolvePageRequest(request, 50, this.#validationContext("listRepositories")),
    );
    return createPage(
      page.items.map((data) => createRepository(this.#adapter, data)),
      page,
    );
  }

  async repository(
    name: string,
    options: OperationOptions = {},
  ): Promise<Repository<TProvider, TVersion, TRegistry>> {
    return createRepository(
      this.#adapter,
      await this.#adapter.getRepository(
        this.#data,
        requireIdentity(name, "repository name", this.#validationContext("getRepository")),
        options,
      ),
    );
  }

  async findRepository(
    name: string,
    options: OperationOptions = {},
  ): Promise<Repository<TProvider, TVersion, TRegistry> | undefined> {
    const found = await this.#adapter.findRepository(
      this.#data,
      requireIdentity(name, "repository name", this.#validationContext("findRepository")),
      options,
    );
    return found === undefined ? undefined : createRepository(this.#adapter, found);
  }

  async hasRepository(name: string, options: OperationOptions = {}): Promise<boolean> {
    return await this.#adapter.hasRepository(
      this.#data,
      requireIdentity(name, "repository name", this.#validationContext("hasRepository")),
      options,
    );
  }

  async createRepository(
    name: string,
    options: CreateRepositoryOptions = {},
  ): Promise<Repository<TProvider, TVersion, TRegistry>> {
    return createRepository(
      this.#adapter,
      await this.#adapter.createRepository(
        this.#data,
        requireIdentity(name, "repository name", this.#validationContext("createRepository")),
        options,
      ),
    );
  }

  #validationContext(operation: string) {
    return {
      provider: this.#adapter.provider,
      version: this.#adapter.version,
      operation,
    };
  }
}

export function createRepositoryContainer<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  data: RepositoryContainerData<TProvider, TVersion, TRegistry>,
): RepositoryContainer<TProvider, TVersion, TRegistry> {
  return new RepositoryContainerImpl(adapter, data);
}
