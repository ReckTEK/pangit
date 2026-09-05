import type { Provider, ProviderTypeRegistry, ProviderVersion } from "./provider.ts";

import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest } from "./pagination.ts";
import type { RepositoryData } from "./repositories.ts";

export interface TagData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly name: string;
  readonly sha: string;
  readonly message?: string;
  /** Present only when the provider payload proves annotated versus lightweight semantics. */
  readonly annotated?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "tag", TRegistry>;
}

export interface CreateTagInput {
  readonly name: string;
  readonly target: string;
  readonly message: string;
}

export interface TagAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  listTags(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    request: ResolvedPageRequest,
  ): Promise<Page<TagData<TProvider, TVersion, TRegistry>>>;
  getTag(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    name: string,
    options?: OperationOptions,
  ): Promise<TagData<TProvider, TVersion, TRegistry>>;
  createTag(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    input: CreateTagInput,
    options?: OperationOptions,
  ): Promise<TagData<TProvider, TVersion, TRegistry>>;
  deleteTag(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    tag: TagData<TProvider, TVersion, TRegistry>,
    options?: OperationOptions,
  ): Promise<void>;
}
