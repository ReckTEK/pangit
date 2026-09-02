import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest } from "./pagination.ts";
import type { RepositoryContainerData, RepositoryData } from "./repositories.ts";

export interface CreateForkOptions<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> extends OperationOptions {
  readonly destination: RepositoryContainerData<TProvider, TVersion>;
  readonly name?: string;
  readonly timeoutMs?: number;
  readonly pollIntervalMs?: number;
}

export interface ForkAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  listForks(
    repository: RepositoryData<TProvider, TVersion>,
    request: ResolvedPageRequest,
  ): Promise<Page<RepositoryData<TProvider, TVersion>>>;
  createFork(
    repository: RepositoryData<TProvider, TVersion>,
    options: CreateForkOptions<TProvider, TVersion>,
  ): Promise<RepositoryData<TProvider, TVersion>>;
}
