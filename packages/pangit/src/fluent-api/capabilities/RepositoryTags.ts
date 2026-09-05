import type {
  FluentProvider,
  ProviderTypeRegistry,
  ProviderVersion,
} from "../adapter-contract/provider.ts";

import type { ValidationErrorContext } from "../adapter-contract/errors.ts";
import type { GitHostAdapter } from "../adapter-contract/GitHostAdapter.ts";
import { type OperationOptions, requireIdentity } from "../adapter-contract/operation-options.ts";

import {
  createPage,
  type Page,
  type PageRequest,
  resolvePageRequest,
} from "../adapter-contract/pagination.ts";

import type { RepositoryData } from "../adapter-contract/repositories.ts";
import type { CreateTagInput } from "../adapter-contract/tags.ts";

import { createTag, type Tag } from "../entities/Tag.ts";

export interface RepositoryTags<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  list(request?: PageRequest): Promise<Page<Tag<TProvider, TVersion, TRegistry>>>;
  get(name: string, options?: OperationOptions): Promise<Tag<TProvider, TVersion, TRegistry>>;
  create(
    input: CreateTagInput,
    options?: OperationOptions,
  ): Promise<Tag<TProvider, TVersion, TRegistry>>;
  delete(tag: Tag<TProvider, TVersion, TRegistry>, options?: OperationOptions): Promise<void>;
}

export function createRepositoryTags<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  repository: RepositoryData<TProvider, TVersion, TRegistry>,
): RepositoryTags<TProvider, TVersion, TRegistry> {
  return Object.freeze({
    async list(request: PageRequest = {}) {
      const page = await adapter.listTags(
        repository,
        resolvePageRequest(request, 50, validationContext(adapter, "listTags")),
      );
      return createPage(page.items.map(createTag), page);
    },
    async get(name: string, options: OperationOptions = {}) {
      const context = validationContext(adapter, "getTag");
      return createTag(
        await adapter.getTag(repository, requireIdentity(name, "tag name", context), options),
      );
    },
    async create(input: CreateTagInput, options: OperationOptions = {}) {
      const context = validationContext(adapter, "createTag");
      requireIdentity(input.name, "tag name", context);
      requireIdentity(input.target, "tag target", context);
      requireIdentity(input.message, "tag message", context);
      return createTag(await adapter.createTag(repository, input, options));
    },
    delete(tag: Tag<TProvider, TVersion, TRegistry>, options: OperationOptions = {}) {
      const context = validationContext(adapter, "deleteTag");
      return adapter.deleteTag(
        repository,
        {
          ...tag,
          name: requireIdentity(tag.name, "tag name", context),
          sha: requireIdentity(tag.sha, "tag SHA", context),
          native: tag.native,
        },
        options,
      );
    },
  });
}

function validationContext<
  TProvider extends FluentProvider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
>(
  adapter: GitHostAdapter<TProvider, TVersion, TRegistry>,
  operation: string,
): ValidationErrorContext<TProvider, TVersion> {
  return { provider: adapter.provider, version: adapter.version, operation };
}
