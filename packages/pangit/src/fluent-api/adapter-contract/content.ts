import type { Provider, ProviderTypeRegistry, ProviderVersion } from "./provider.ts";
import type { ProviderExtensionOptions } from "../provider-extensions/ProviderExtensionRegistry.ts";

import type { ProviderEntityNative } from "../native-access/ProviderNativeRegistry.ts";
import type { CommitData, GitActor } from "./commits.ts";
import type { ContentBlobOptions, ProviderMediaType } from "./content-body.ts";
import type { BoundedOperationOptions, OperationOptions } from "./operation-options.ts";
import type { RepositoryData } from "./repositories.ts";

export type RepositoryContentKind = "file" | "directory" | "symlink" | "submodule";

export interface ContentData<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly kind: RepositoryContentKind;
  readonly path: string;
  readonly name: string;
  readonly sha?: string;
  readonly size?: number;
  readonly bytes?: Uint8Array;
  readonly mediaType?: ProviderMediaType;
  readonly target?: string;
  readonly submoduleUrl?: string;
  /** One explicitly dereferenced target that was proven to stay inside this provider. */
  readonly dereferenced?: ContentData<TProvider, TVersion, TRegistry>;
  readonly lastCommitSha?: string;
  /** Object/blob SHA for this path at the resolved commit's first parent, when requested. */
  readonly firstParentSha?: string;
  readonly native: ProviderEntityNative<TProvider, TVersion, "content", TRegistry>;
}

export interface ReadContentOptions extends OperationOptions {
  readonly ref?: string;
  /** Defaults to true for a direct file read. */
  readonly includeBytes?: boolean;
  readonly includeCommitMetadata?: boolean;
}

/** Body reads always load file bytes; directories and links are not implicitly dereferenced. */
export interface ReadFileOptions extends Omit<ReadContentOptions, "includeBytes"> {}

/** Read a standard web Blob using provider MIME evidence, then a filename-extension fallback. */
export interface ReadContentBlobOptions extends ReadFileOptions, ContentBlobOptions {}

/** Linked content is metadata-only unless this internal-only mode is selected. */
export interface ReadLinkedContentOptions extends ReadContentOptions {
  readonly dereference?: "internal";
}

export interface ReadFilesOptions extends BoundedOperationOptions {
  readonly ref?: string;
}

/** Default caller-visible ceiling for batch content operations. */
export const DEFAULT_CONTENT_BATCH_MAX_ITEMS = 200;

export interface ContentReadResult<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  readonly path: string;
  readonly content?: ContentData<TProvider, TVersion, TRegistry>;
  readonly unavailable?: "missing" | "too-large" | "not-a-file";
}

export interface ListDirectoryOptions extends BoundedOperationOptions {
  readonly ref?: string;
  /** Flatten descendants through `maxDepth`; false performs exactly one directory request. */
  readonly recursive?: boolean;
  /** Required when recursive traversal or single-folder collapsing is requested. */
  readonly maxDepth?: number;
  /** Required for recursive traversal; bounds the total returned provider entries. */
  readonly maxItems?: number;
  /** Follow only the leading one-directory/no-file chain, stopping at `maxDepth`. */
  readonly collapseSingleFolders?: boolean;
}

export interface ReadPathMetadataBatchOptions extends BoundedOperationOptions {
  readonly ref?: string;
  readonly compareFirstParent?: boolean;
}

export type FileChange =
  | {
    readonly operation: "create" | "upsert";
    readonly path: string;
    readonly content: string | Uint8Array;
  }
  | {
    readonly operation: "update";
    readonly path: string;
    readonly content: string | Uint8Array;
    readonly sha?: string;
  }
  | { readonly operation: "delete"; readonly path: string; readonly sha?: string }
  | {
    readonly operation: "move";
    readonly fromPath: string;
    readonly path: string;
    readonly sha?: string;
  };

export interface CommitFileChangesInput {
  readonly branch: string;
  readonly newBranch?: string;
  readonly message: string;
  readonly changes: readonly FileChange[];
  readonly author?: GitActor;
}

export type CommitFileChangesExtension<
  TProvider extends Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> = ProviderExtensionOptions<
  "content.commitChanges",
  TProvider,
  TRegistry
>;

export interface CommitFileChangesOptions<
  TProvider extends Provider = Provider,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> extends OperationOptions {
  readonly extension?: CommitFileChangesExtension<TProvider, TRegistry>;
}

export interface ContentAdapter<
  TProvider extends Provider,
  TVersion extends ProviderVersion<TProvider, TRegistry>,
  TRegistry extends ProviderTypeRegistry = Record<never, never>,
> {
  /** Read a file as a standard web Blob; may resolve metadata before fetching raw bytes. */
  readContentBlob(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ReadContentBlobOptions,
  ): Promise<globalThis.Blob>;
  /** One direct file read returning an independent byte array. */
  readContentBytes(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ReadFileOptions,
  ): Promise<Uint8Array>;
  /** One direct file read decoded as strict UTF-8, with its BOM removed. */
  readContentText(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ReadFileOptions,
  ): Promise<string>;
  /** One direct file read parsed as UTF-8 JSON; callers validate the returned value. */
  readContentJson(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ReadFileOptions,
  ): Promise<unknown>;
  readContent(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ReadContentOptions,
  ): Promise<ContentData<TProvider, TVersion, TRegistry>>;
  readFiles(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    paths: readonly string[],
    options?: ReadFilesOptions,
  ): Promise<readonly ContentReadResult<TProvider, TVersion, TRegistry>[]>;
  getDirectory(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ReadContentOptions,
  ): Promise<ContentData<TProvider, TVersion, TRegistry>>;
  listDirectory(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ListDirectoryOptions,
  ): Promise<readonly ContentData<TProvider, TVersion, TRegistry>[]>;
  readPathMetadataBatch(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    paths: readonly string[],
    options?: ReadPathMetadataBatchOptions,
  ): Promise<readonly ContentReadResult<TProvider, TVersion, TRegistry>[]>;
  readSymlink(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ReadLinkedContentOptions,
  ): Promise<ContentData<TProvider, TVersion, TRegistry>>;
  readSubmodule(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    path: string,
    options?: ReadLinkedContentOptions,
  ): Promise<ContentData<TProvider, TVersion, TRegistry>>;
  commitFileChanges(
    repository: RepositoryData<TProvider, TVersion, TRegistry>,
    input: CommitFileChangesInput,
    options?: CommitFileChangesOptions<TProvider, TRegistry>,
  ): Promise<CommitData<TProvider, TVersion, TRegistry>>;
}
