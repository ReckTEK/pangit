import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import type { OperationOptions } from "../adapter-contract/operation-options.ts";
import type { Page, PageRequest } from "../adapter-contract/pagination.ts";
import { createPage, resolvePageRequest } from "../adapter-contract/pagination.ts";
import type {
  CreateRepositoryOptions,
  RepositoryContainerData,
  RepositoryContainerKind,
} from "../adapter-contract/repositories.ts";
import { requireIdentity } from "../adapter-contract/operation-options.ts";
import type { ProviderRepositoryContainerNative } from "../native-access/ProviderNativeRegistry.ts";
import type { FluentProvider } from "../provider-registry.ts";
import { createRepository, type Repository } from "./Repository.ts";

/** A fetched repository-owning user or organization. */
export interface RepositoryContainer<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly kind: RepositoryContainerKind;
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly native: ProviderRepositoryContainerNative<TProvider, TVersion>;

  /** Fetch one bounded provider page; this never drains the complete collection. */
  repositories(request?: PageRequest): Promise<Page<Repository<TProvider, TVersion>>>;
  repository(
    name: string,
    options?: OperationOptions,
  ): Promise<Repository<TProvider, TVersion>>;
  findRepository(
    name: string,
    options?: OperationOptions,
  ): Promise<Repository<TProvider, TVersion> | undefined>;
  hasRepository(name: string, options?: OperationOptions): Promise<boolean>;
  createRepository(
    name: string,
    options?: CreateRepositoryOptions,
  ): Promise<Repository<TProvider, TVersion>>;
}

class RepositoryContainerImpl<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> implements RepositoryContainer<TProvider, TVersion> {
  readonly #adapter: GitHostAdapter<TProvider, TVersion>;
  readonly #data: RepositoryContainerData<TProvider, TVersion>;
  readonly kind: RepositoryContainerKind;
  readonly id: string;
  readonly name: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly native: ProviderRepositoryContainerNative<TProvider, TVersion>;

  constructor(
    adapter: GitHostAdapter<TProvider, TVersion>,
    data: RepositoryContainerData<TProvider, TVersion>,
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

  async repositories(request: PageRequest = {}): Promise<Page<Repository<TProvider, TVersion>>> {
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
  ): Promise<Repository<TProvider, TVersion>> {
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
  ): Promise<Repository<TProvider, TVersion> | undefined> {
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
  ): Promise<Repository<TProvider, TVersion>> {
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
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: GitHostAdapter<TProvider, TVersion>,
  data: RepositoryContainerData<TProvider, TVersion>,
): RepositoryContainer<TProvider, TVersion> {
  return new RepositoryContainerImpl(adapter, data);
}
