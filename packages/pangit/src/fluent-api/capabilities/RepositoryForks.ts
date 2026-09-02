import type { ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { ValidationErrorContext } from "../adapter-contract/errors.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import type { CreateForkOptions } from "../adapter-contract/forks.ts";
import { requireIdentity, requirePositiveInteger } from "../adapter-contract/operation-options.ts";
import type { Page, PageRequest } from "../adapter-contract/pagination.ts";
import { createPage, resolvePageRequest } from "../adapter-contract/pagination.ts";
import type { RepositoryData } from "../adapter-contract/repositories.ts";
import type { FluentProvider } from "../provider-registry.ts";
import { createRepository, type Repository } from "../entities/Repository.ts";

export interface RepositoryForks<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
> {
  /** Fetch one bounded provider page of forks. */
  list(request?: PageRequest): Promise<Page<Repository<TProvider, TVersion>>>;
  /** Create a fork and poll only its known destination until directly usable. */
  create(options: CreateForkOptions<TProvider, TVersion>): Promise<Repository<TProvider, TVersion>>;
}

export function createRepositoryForks<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider>,
>(
  adapter: GitHostAdapter<TProvider, TVersion>,
  repository: RepositoryData<TProvider, TVersion>,
): RepositoryForks<TProvider, TVersion> {
  return Object.freeze({
    async list(request: PageRequest = {}) {
      const page = await adapter.listForks(
        repository,
        resolvePageRequest(request, 50, validationContext(adapter, "listForks")),
      );
      return createPage(page.items.map((item) => createRepository(adapter, item)), page);
    },
    async create(options: CreateForkOptions<TProvider, TVersion>) {
      const context = validationContext(adapter, "createFork");
      requireIdentity(options.destination.name, "fork destination name", context);
      requireIdentity(options.name ?? repository.name, "fork repository name", context);
      requirePositiveInteger(options.timeoutMs ?? 10_000, "fork timeout", context);
      requirePositiveInteger(options.pollIntervalMs ?? 200, "fork poll interval", context);
      return createRepository(adapter, await adapter.createFork(repository, options));
    },
  });
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
