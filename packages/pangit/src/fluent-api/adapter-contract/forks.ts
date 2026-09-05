import type { Provider, ProviderTypeRegistry, ProviderVersion } from "./provider.ts";

import type { OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest } from "./pagination.ts";
import type { RepositoryContainerData, RepositoryData } from "./repositories.ts";

export interface CreateForkOptions<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends OperationOptions {
  readonly destination: RepositoryContainerData<TProvider, TVersion, TRegistry>;
  readonly name?: string;
  readonly timeoutMs?: number;
  readonly pollIntervalMs?: number;
}

export interface ForkAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  listForks(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    request: ResolvedPageRequest,
  ): Promise<Page<RepositoryData<TProvider, TVersion, TRegistry>>>;
  createFork(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    options: CreateForkOptions<TProvider, TVersion, TRegistry>,
  ): Promise<RepositoryData<TProvider, TVersion, TRegistry>>;
}
