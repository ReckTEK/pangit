import type { Provider, ProviderVersion } from "../../generated-rest-clients/git-host.ts";
import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { OperationOptions } from "./operation-options.ts";
import type { Page, ResolvedPageRequest } from "./pagination.ts";
import type { RepositoryData } from "./repositories.ts";

export interface TagData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  readonly name: string;
  readonly sha: string;
  readonly message?: string;
  /** Present only when the provider payload proves annotated versus lightweight semantics. */
  readonly annotated?: boolean;
  readonly native: ProviderEntityNative<TProvider, TVersion, "tag">;
}

export interface CreateTagInput {
  readonly name: string;
  readonly target: string;
  readonly message: string;
}

export interface TagAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider>,
> {
  listTags(
    repository: RepositoryData<TProvider, TVersion>,
    request: ResolvedPageRequest,
  ): Promise<Page<TagData<TProvider, TVersion>>>;
  getTag(
    repository: RepositoryData<TProvider, TVersion>,
    name: string,
    options?: OperationOptions,
  ): Promise<TagData<TProvider, TVersion>>;
  createTag(
    repository: RepositoryData<TProvider, TVersion>,
    input: CreateTagInput,
    options?: OperationOptions,
  ): Promise<TagData<TProvider, TVersion>>;
  deleteTag(
    repository: RepositoryData<TProvider, TVersion>,
    tag: TagData<TProvider, TVersion>,
    options?: OperationOptions,
  ): Promise<void>;
}
